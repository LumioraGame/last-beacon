import XCTest

// Run only after the host upgrade check installs a higher-build QA app over a saved wave.
final class UpgradeUITests: XCTestCase {
    func testContinueAfterAppUpdate() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "ai.lumiora.lastbeacon")
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        let resumeSaved = app.buttons["Continue watch →"]
        XCTAssertTrue(resumeSaved.waitForExistence(timeout: 30))
        resumeSaved.tap()
        XCTAssertTrue(app.buttons["Resume watch →"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["Begin the first wave →"].exists)
        XCTAssertTrue(app.staticTexts["115"].exists)
        let defense = app.buttons.matching(NSPredicate(format: "label CONTAINS %@ AND label CONTAINS %@", "Pad 02", "Sentinel")).firstMatch
        XCTAssertTrue(defense.exists)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "Saved watch after app update"
        shot.lifetime = .keepAlways
        add(shot)
    }
}
