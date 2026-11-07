import XCTest

final class SmokeUITests: XCTestCase {
    private func newEnglishWatch() -> XCUIApplication {
        let app = XCUIApplication(bundleIdentifier: "ai.lumiora.lastbeacon")
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        let newWatch = app.buttons.matching(NSPredicate(format: "label IN %@", ["Start a new watch", "开始新的一局"])).firstMatch
        if newWatch.waitForExistence(timeout: 8) { newWatch.tap() }
        let menu = app.buttons.matching(NSPredicate(format: "label IN %@", ["Menu", "菜单"])).firstMatch
        XCTAssertTrue(menu.waitForExistence(timeout: 30))
        menu.tap()
        // A saved preference takes precedence over the simulator's launch language.
        if app.buttons["切换为英文"].exists { app.buttons["切换为英文"].tap() }
        menu.tap()
        return app
    }
    func testHandbookDuringCombat() throws {
        continueAfterFailure = false
        let app = newEnglishWatch()
        let start = app.buttons["Begin the first wave →"]
        XCTAssertTrue(start.waitForExistence(timeout: 15))
        start.tap()
        let menu = app.buttons["Menu"]
        menu.tap()
        let help = app.buttons["Open handbook"]
        XCTAssertTrue(help.waitForExistence(timeout: 5))
        help.tap()
        let close = app.buttons["Close handbook"]
        XCTAssertTrue(close.waitForExistence(timeout: 5))
        close.tap()
    }
    func testTouchLifecycleAndRotation() throws {
        continueAfterFailure = false
        let app = newEnglishWatch()
        let continueWatch = app.buttons["Continue watch →"]
        let menu = app.buttons["Menu"]
        XCTAssertTrue(menu.waitForExistence(timeout: 30))
        menu.tap()
        let handbook = app.buttons["Open handbook"]
        XCTAssertTrue(handbook.waitForExistence(timeout: 5))
        handbook.tap()
        let close = app.buttons["Close handbook"]
        XCTAssertTrue(close.waitForExistence(timeout: 5))
        close.tap()
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(menu.waitForExistence(timeout: 5))
        menu.tap()
        XCTAssertTrue(handbook.waitForExistence(timeout: 5))
        handbook.tap()
        XCTAssertTrue(close.waitForExistence(timeout: 5))
        close.tap()
        XCUIDevice.shared.orientation = .landscapeRight
        XCTAssertTrue(menu.isHittable)
        XCUIDevice.shared.orientation = .portrait
        let coach = app.buttons["Got it"]
        if coach.exists && coach.isHittable { coach.tap() }
        // WKWebView exposes aria-pressed build buttons as switches in native accessibility.
        let sentinel = app.switches["Sentinel · 65"]
        XCTAssertTrue(sentinel.waitForExistence(timeout: 5))
        sentinel.tap()
        let pad = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Pad 02 · Empty pad")).firstMatch
        XCTAssertTrue(pad.waitForExistence(timeout: 5))
        pad.tap()
        XCTAssertTrue(app.staticTexts["115"].waitForExistence(timeout: 5))
        app.buttons["Begin the first wave →"].tap()
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.buttons["Resume watch →"].firstMatch.waitForExistence(timeout: 5))
        app.terminate()
        app.launch()
        XCTAssertTrue(continueWatch.waitForExistence(timeout: 15))
        continueWatch.tap()
        XCTAssertTrue(app.buttons["Resume watch →"].firstMatch.waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Begin the first wave →"].exists)
        XCTAssertTrue(app.staticTexts["115"].exists)
        XCUIDevice.shared.orientation = .portrait
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "Restored paused watch"
        shot.lifetime = .keepAlways
        add(shot)
    }
}
