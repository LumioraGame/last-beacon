import XCTest

final class StoreCaptureUITests: XCTestCase {
    func testCaptureEnglish() throws { try capture(chinese: false) }
    func testCaptureChinese() throws { try capture(chinese: true) }

    private func capture(chinese: Bool) throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "ai.lumiora.lastbeacon")
        app.launch()
        let continueWatch = app.buttons.matching(NSPredicate(format: "label IN %@", ["Continue watch →", "继续守望 →"])).firstMatch
        XCTAssertTrue(continueWatch.waitForExistence(timeout: 30), "Load a store-scene checkpoint before running this capture")
        continueWatch.tap()
        let menu = app.buttons.matching(NSPredicate(format: "label IN %@", ["Menu", "菜单"])).firstMatch
        XCTAssertTrue(menu.waitForExistence(timeout: 5)); menu.tap()
        if chinese && app.buttons["Switch to Chinese"].exists { app.buttons["Switch to Chinese"].tap() }
        if !chinese && app.buttons["切换为英文"].exists { app.buttons["切换为英文"].tap() }
        menu.tap()
        let coach = app.buttons.matching(NSPredicate(format: "label IN %@", ["Got it", "知道了"])).firstMatch
        if coach.exists && coach.isHittable { coach.tap() }
        let resume = app.buttons.matching(NSPredicate(format: "label IN %@", ["Resume watch →", "继续守望 →"])).firstMatch
        XCTAssertTrue(resume.waitForExistence(timeout: 5)); resume.tap()
        let rendered = expectation(description: "Live scene rendered")
        DispatchQueue.main.asyncAfter(deadline: .now()+3) { rendered.fulfill() }
        wait(for: [rendered], timeout: 5)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = chinese ? "store-zh-Hans" : "store-en"
        shot.lifetime = .keepAlways
        add(shot)
    }
}
