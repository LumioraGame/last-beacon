// macOS-only local upload signing. Passwords stay in Keychain and child-process
// environments; the private keystore lives outside the repository.
import Foundation
import Security
import Darwin

let appId = "ai.lumiora.lastbeacon"
let service = "ai.lumiora.lastbeacon.android-upload"
let alias = "last-beacon-upload"
let manager = FileManager.default
let root = URL(fileURLWithPath: manager.currentDirectoryPath)
let directory = manager.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Lumiora/Signing/ai.lumiora.lastbeacon", isDirectory: true)
let keystore = directory.appendingPathComponent("upload.p12")
let create = CommandLine.arguments.dropFirst().contains("--create-key")

func fail(_ message: String) -> NSError { NSError(domain: appId, code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
func password(allowCreate: Bool) throws -> String {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                              kSecAttrService as String: service, kSecAttrAccount as String: alias,
                              kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
    var value: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &value)
    if status == errSecSuccess, let data = value as? Data, let text = String(data: data, encoding: .utf8) { return text }
    guard status == errSecItemNotFound else { throw fail("Keychain access failed (OSStatus \(status)); unlock the login keychain and retry.") }
    guard allowCreate, !manager.fileExists(atPath: keystore.path) else { throw fail("No matching Keychain password. Existing keystores are never replaced; recover the original password or provision an explicit new app key.") }
    var bytes = [UInt8](repeating: 0, count: 32)
    guard bytes.withUnsafeMutableBytes({ SecRandomCopyBytes(kSecRandomDefault, $0.count, $0.baseAddress!) }) == errSecSuccess else { throw fail("Secure random generation failed") }
    let text = bytes.map { String(format: "%02x", $0) }.joined()
    let item: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                             kSecAttrService as String: service, kSecAttrAccount as String: alias,
                             kSecAttrLabel as String: "Last Beacon Android upload keystore",
                             kSecValueData as String: Data(text.utf8)]
    let added = SecItemAdd(item as CFDictionary, nil)
    guard added == errSecSuccess else { throw fail("Could not save the upload password to Keychain (OSStatus \(added))") }
    return text
}
func run(_ tool: URL, _ arguments: [String], environment: [String: String], output: FileHandle = .standardOutput) throws {
    let process = Process()
    process.executableURL = tool; process.arguments = arguments; process.environment = environment
    process.currentDirectoryURL = root; process.standardInput = FileHandle.nullDevice
    process.standardOutput = output; process.standardError = output
    try process.run(); process.waitUntilExit()
    guard process.terminationStatus == 0 else { throw fail("\(tool.lastPathComponent) failed with exit code \(process.terminationStatus)") }
}

do {
    umask(0o077)
    let config = try JSONSerialization.jsonObject(with: Data(contentsOf: root.appendingPathComponent("capacitor.config.json"))) as? [String: Any]
    guard config?["appId"] as? String == appId else { throw fail("Run from the Last Beacon project root") }
    guard CommandLine.arguments.count == 1 || Array(CommandLine.arguments.dropFirst()) == ["--create-key"] else { throw fail("Use no arguments to sign, or --create-key to provision this app's upload key") }
    var environment = ProcessInfo.processInfo.environment
    guard let javaHome = environment["JAVA_HOME"], manager.isExecutableFile(atPath: javaHome + "/bin/keytool") else { throw fail("Set JAVA_HOME to the Java 21 SDK before signing") }
    if !create {
        try run(URL(fileURLWithPath: "/usr/bin/env"), ["npm", "run", "build:native"], environment: environment)
        try run(URL(fileURLWithPath: "/usr/bin/env"), ["npx", "cap", "sync", "android"], environment: environment)
    }
    try manager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
    let secret = try password(allowCreate: create)
    environment["LAST_BEACON_KEYSTORE"] = keystore.path
    environment["LAST_BEACON_STORE_PASSWORD"] = secret
    environment["LAST_BEACON_KEY_PASSWORD"] = secret
    environment["LAST_BEACON_KEY_ALIAS"] = alias
    let keytool = URL(fileURLWithPath: javaHome + "/bin/keytool")
    let keyArguments = ["-keystore", keystore.path, "-storepass:env", "LAST_BEACON_STORE_PASSWORD", "-alias", alias]
    if !manager.fileExists(atPath: keystore.path) {
        guard create else { throw fail("No upload key exists. Use --create-key explicitly to provision this new app's key.") }
        let pending = directory.appendingPathComponent("upload.pending.p12")
        guard !manager.fileExists(atPath: pending.path) else { throw fail("A pending keystore exists; inspect it before retrying. No key has been replaced.") }
        try run(keytool, ["-genkeypair", "-noprompt", "-storetype", "PKCS12", "-keystore", pending.path,
                          "-storepass:env", "LAST_BEACON_STORE_PASSWORD", "-keypass:env", "LAST_BEACON_KEY_PASSWORD",
                          "-alias", alias, "-keyalg", "RSA", "-keysize", "4096", "-sigalg", "SHA256withRSA",
                          "-validity", "10000", "-dname", "CN=Last Beacon Upload, O=Lumiora Labs Inc"], environment: environment)
        try manager.moveItem(at: pending, to: keystore)
        try manager.setAttributes([.posixPermissions: 0o600], ofItemAtPath: keystore.path)
    }
    let evidence = root.appendingPathComponent("artifacts/android-signing", isDirectory: true)
    try manager.createDirectory(at: evidence, withIntermediateDirectories: true)
    try run(keytool, ["-exportcert", "-rfc"] + keyArguments + ["-file", evidence.appendingPathComponent("upload-certificate.pem").path], environment: environment)
    if create {
        print("App-specific upload key is ready: \(keystore.path)")
        print("Password: macOS Keychain service \(service), account \(alias). No secret was printed or exported.")
    } else {
        try run(root.appendingPathComponent("android/gradlew"), ["-p", "android", "--no-daemon", "--console=plain", ":app:bundleRelease"], environment: environment)
        let log = evidence.appendingPathComponent("jarsigner.log")
        _ = manager.createFile(atPath: log.path, contents: nil)
        let output = try FileHandle(forWritingTo: log)
        defer { try? output.close() }
        try run(URL(fileURLWithPath: javaHome + "/bin/jarsigner"), ["-J-Duser.language=en", "-J-Duser.country=US", "-verify", "android/app/build/outputs/bundle/release/app-release.aab"], environment: environment, output: output)
        try output.synchronize()
        guard try String(contentsOf: log, encoding: .utf8).contains("jar verified.") else { throw fail("Candidate is unsigned or verification failed; inspect artifacts/android-signing/jarsigner.log") }
        print("Signed Android candidate; public certificate: artifacts/android-signing/upload-certificate.pem")
    }
} catch {
    FileHandle.standardError.write(Data("Last Beacon signing failed: \(error.localizedDescription)\n".utf8)); exit(1)
}
