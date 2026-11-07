# Last Beacon store materials

App ID / Android package: `ai.lumiora.lastbeacon`. Publisher selected the `ai.lumiora` namespace; the app name remains **Last Beacon / 最后的灯塔**. First release is free, offline, and has no accounts, advertising, or in-app purchases. Marketing version comes from `package.json`; build numbers come from `npm run mobile:version` or `MOBILE_BUILD_NUMBER`.

## English

App name: **Last Beacon**

App Store subtitle: **Build. Connect. Keep the light.**

Play short description: **Connect your defenses and guide the light through a coastal tower defense.**

Full description:

One lighthouse. One power grid. Keep the last light alive.

Build a defense on a small coastal island and connect every tower back to the beacon. Place relays to reach new ground, expand your power capacity, and decide which defenses deserve an upgrade.

The lighthouse is part of your strategy. Tap the ground to direct its beam: illuminated enemies take more damage and move more slowly. When night falls, light reveals enemies that distant towers cannot otherwise see.

- Mix Sentinels, Mortars, Frost Towers, and chain-lightning Arcs.
- Survive ten waves of mechanical creatures and face the Abyssal Colossus.
- Continue into the endless tide after victory.
- Choose from three difficulty levels and switch tower targeting tactics.
- Rotate, zoom, and pan around a changing coastal diorama, or use the 2D view on older devices.
- Pause whenever you need, and continue your saved watch when you return.
- Play offline, without an account, ads, or in-app purchases.
- Choose English or Simplified Chinese.

App Store keywords: `tower defense,lighthouse,strategy,offline,island,power,beacon,endless,coastal`

Version 1.0.0 release notes: **Begin your first watch. Build a connected island defense, direct the beacon, and survive the night.**

## 简体中文

应用名称：**最后的灯塔**

App Store 副标题：**建造防线，连接电网，守住最后一束光**

Google Play 简短说明：**一座灯塔，一张电网。建造海岛防线，用光束照亮黑夜，守住最后一束光。**

完整描述：

一座灯塔，一张电网。守住最后一束光。

在海岛上建造防线，让每座炮塔通过设施和中继站连接到灯塔。有限的电力容量决定哪些设施能够开火，布局、扩容与升级都需要取舍。

灯塔本身也是武器。点击地面移动光束，被照亮的敌人更慢、更脆弱；到了夜里，远处的炮塔需要灯光才能发现敌人。照亮敌群、施放聚光，在海风与风暴中守住海岸。

- 哨戒炮、迫击炮、寒潮塔与连锁电弧，搭配不同防线。
- 十波机械生物来袭，最终迎战深渊巨像。
- 胜利后可继续挑战无尽潮汐。
- 轻松、标准、困难三档难度，多种索敌方式。
- 旋转、缩放、平移海岛视角，也可切换到 2D。
- 随时暂停，返回时继续上次保存的守望。
- 离线游玩，无需账号，无广告，无内购。
- 支持简体中文与英文。

App Store 关键词：`塔防,灯塔,策略,离线,海岛,电网,建造,守望,无尽,光束`

1.0.0 更新说明：**开始你的第一场守望。连接海岛防线，操控灯塔光束，守住这一夜。**

## Review notes

The game runs entirely from assets bundled with the app and requires no account, password, network connection, or purchases. To play, tap an empty island pad, choose a defense, then select Begin the first wave. Tap open ground to direct the beacon. The handbook is in the menu. A saved watch can be continued after relaunch and opens paused. Graphics quality and a 2D fallback are available in the menu. Sound starts disabled; on iOS, ambient audio respects silent mode. The app contains fictional mechanical combat.

## Submission inputs and remaining verification

- Published privacy policy: **https://lumioragame.github.io/last-beacon/privacy.html**. Published support page: **https://lumioragame.github.io/last-beacon/support.html**. Sources are `legal/privacy.html` and `legal/support.html`, also included in the static build. Publication uses the separate `mobile-policy-pages` branch; it does not change the default code branch or established game website. Both URLs must be rechecked against the final release.
- Working support contact: **https://github.com/LumioraGame/last-beacon/issues**. Issues were enabled for this public fork. A publisher-provided email/contact destination may replace it before release. Check final publisher identity/contact when completing store forms.
- No collection/sharing is the proposed App Privacy / Data safety answer based on the current runtime and dependency set, pending final archive audit and publisher declarations. Do not claim GitHub or platform services collect nothing when the player chooses to use them.
- Fill current content/age ratings from actual mechanical combat. Choose no ads and no purchases; choose the target audience honestly. Do not list in the Kids category by default.
- Exclude mainland China at launch without the required game approvals. Retain Simplified Chinese elsewhere.
- iOS device family is iPhone for v1, minimum iOS 15.5. Android minimum API 24, target API 36; test actual supported minimum devices before making compatibility claims.
- Native source artwork and generated icon/feature-graphic assets are in `assets/mobile/`. Packaged-app screenshots are in `artifacts/store-screenshots/`, with a manifest per platform/device class. English and zh-Hans each show connected building, night combat, and the boss: iPhone 1206×2622 / 1320×2868, Android phone 1080×1920 and tablet 1600×2560. See `docs/VALIDATION.md` for candidate provenance and the README capture commands. These are simulator/emulator screenshots; inspect them against the exact signed candidate and current console requirements before uploading.
- Apple team **N2U5V543PB / Lumiora Labs Inc.** is confirmed from the local development certificate and a successfully verified development-signed build. Apple distribution signing, Android upload-key custody, legal/trader declarations, and applicable store beta/production access remain publisher inputs. No store registration, submission, or release has been performed by these changes.
