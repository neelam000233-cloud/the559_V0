import { useCallback, useSyncExternalStore } from "react"
import { createPersistedStore } from "./persisted-store"

export type Lang = "en" | "zh"

const EN = {
  // Start screen
  "start.title": "Blame Game · PvE",
  "start.difficulty": "AI Difficulty",
  "start.tutorialTab": "Tutorial",
  "start.desc.1": "Lv1: Opponent doesn't read you and can't Parry / Feint",
  "start.desc.2": "Lv2: Opponent doesn't read you, but can Parry / Feint",
  "start.desc.3": "Lv3: Opponent reads your behavior and can Parry / Feint",
  "start.desc.tutorial": "Guided practice: learn tossing, blocking, parrying and feinting. You can't lose.",
  "start.startMatch": "Start Match",
  "start.startTutorial": "Start Tutorial",
  "start.controls": "With the document: Space = Toss, F = Feint. Without it: Hold Space = Block; the first part of the hold is the Parry window.",
  "start.recommended": "New",
  "start.completed": "Done",
  "start.firstTitle": "First time here?",
  "start.firstBody": "A short guided tutorial teaches every move step by step.",
  "start.firstCta": "Start tutorial",

  // HUD
  "hud.player": "Player",
  "hud.opponent": "Opponent",
  "hud.combo": "Combo x{n}",
  "hud.pause": "Pause",
  "hud.resume": "Resume",
  "hud.settings": "Settings",
  "hud.docYou": "You have the document",
  "hud.docOpp": "Opponent has the document",
  "hud.hint": "With document: Space = Toss · F = Feint  |  Without: Hold Space = Block (early window = Parry)",
  "hud.san": "SAN",
  "hud.heat": "HEAT",
  "bar.parry": "PARRY",
  "bar.block": "BLOCK",
  "bar.cooldown": "COOLDOWN",

  // Action labels coming from the engine
  "PARRY!": "PARRY!",
  "Blocked (reduced)": "Blocked (reduced)",
  "Blame tossed!": "Blame tossed!",
  "Got hit!": "Got hit!",

  // Outcome
  "end.win": "You Win!",
  "end.lose": "You Lose",
  "end.doubleLoss": "Double Loss",
  "end.doubleWin": "Double Win",
  "end.tosses": "Tosses landed: {n}",
  "end.parries": "Parries: {n}",
  "end.blocks": "Blocks: {n}",
  "end.sanLeft": "SAN left: {n}",
  "end.heat": "HEAT: {n}",
  "end.playAgain": "Play Again",

  // Settings
  "settings.title": "Settings",
  "settings.effects": "Impact Effects (Camera Shake / Hitstop)",
  "settings.strong": "Strong",
  "settings.light": "Light",
  "settings.strongDesc": "Bigger camera shake and longer hitstop on impact for punchier feedback.",
  "settings.lightDesc": "Subtler impact feedback for players who prefer a steadier view.",
  "settings.language": "Language",
  "settings.close": "Close",

  // Tutorial chrome
  "tut.progress": "Step {n} of {total}",
  "tut.continue": "Continue",
  "tut.tryIt": "Got it, let me try",
  "tut.skip": "Skip step",
  "tut.exit": "Exit tutorial",
  "tut.finish": "Start real match",
  "tut.paused": "Game paused while I explain",
  "tut.slowmo": "Slow motion",
  "tut.yourTurn": "Your turn",
  "tut.nice": "Nice!",
  "tut.tryAgain": "Not quite. Retrying automatically...",
  "tut.keyHold": "hold",
  "tut.keyPress": "press",

  // Steps
  "intro-scene.title": "Welcome to the office",
  "intro-scene.explain":
    "Two colleagues are passing the blame, which is the document in the middle. Whoever holds the document attacks by tossing it; the other one defends. Right now you hold it.",
  "intro-bars.title": "SAN and HEAT",
  "intro-bars.explain":
    "Blue is SAN (sanity). Red is HEAT (pressure). Taking hits drains SAN and builds HEAT. If your SAN hits 0 or your HEAT maxes out, you lose. Your bars are on the left, the opponent's on the right.",
  "intro-timer.title": "Clock and controls",
  "intro-timer.explain":
    "A real match lasts 3 minutes. If time runs out, both sides win, or both lose if both are in bad shape. The controls are summarized at the bottom: Space and F. The clock is frozen during this tutorial.",
  "toss.title": "Toss the document",
  "toss.explain":
    "While you hold the document, press Space to toss it at the opponent. If they aren't guarding, it lands: they lose SAN, gain HEAT, and the document moves to them.",
  "toss.practice": "Press Space to toss the document.",
  "toss.success": "Landed! Watch the opponent's bars: SAN down, HEAT up. The document is theirs now.",
  "block.title": "Block",
  "block.explain":
    "When the opponent holds the document, they will toss it at you. Press Space to enter the Parry window. If you miss it, you enter an unavoidable cooldown; there is no ordinary Block window. A cooldown guard catches an attack but punishes the attacker more.",
  "block.practice": "Press Space to enter Parry. If you miss the window, release or keep holding: the cooldown cannot be canceled.",
  "block.success": "Blocked! You took reduced damage and the document is yours.",
  "parry.title": "Parry",
  "parry.explain":
    "Press Space just before the toss arrives and it lands in the Parry window, the first part of your guard. A Parry cancels all damage, bounces the document back, and punishes the attacker harder. The game slows down here so you can learn the timing.",
  "parry.practice": "The opponent winds up. Wait a moment, then press Space just before the toss arrives.",
  "parry.success": "Perfect Parry! The attack was stopped immediately and your defense ended.",
  "feint.title": "Feint",
  "feint.explain":
    "While you hold the document, press F to fake a toss. Nothing is thrown, but the defender may panic and raise their guard early, which spoils their timing.",
  "feint.practice": "Press F to feint.",
  "feint.success": "See that? The opponent flinched and raised their guard.",
  "penalty.title": "Getting countered",
  "penalty.explain":
    "If you toss into a guarding opponent, you pay for it: a Block costs you {blockSan} SAN and adds {blockHeat} HEAT, a Parry costs {parrySan} SAN and adds {parryHeat} HEAT. Bluffing with a feint first helps avoid this.",
  "penalty.practice": "The opponent is guarding. Press Space to toss anyway and watch your own bars.",
  "penalty.success": "Countered! Your SAN dropped and your HEAT rose. Don't toss blindly into a guard.",
  "summary.title": "You're ready",
  "summary.explain":
    "Recap:\n- Space with the document: toss. Without it: hold to guard.\n- Early in the hold is a Parry, later is a Block.\n- F fakes a toss to bait a guard.\n- Getting countered costs you SAN and HEAT.\nYour real match starts at Lv1.",

  // Failure reasons
  "fail.notGuarding": "The toss landed while you weren't guarding. Start holding Space before it arrives.",
  "fail.blockWasParry": "That was a Parry, not a Block. Keep holding Space longer, into the blue part of the bar.",
  "fail.parryTooEarly": "Too early: you were already past the Parry window. Press Space only when the opponent winds up.",
  "fail.parryTooLate": "Too late: you pressed after the toss. Press Space as soon as the opponent winds up.",
  "fail.generic": "That didn't work. Let's try again.",
} as const

export type MessageKey = keyof typeof EN

const ZH: Record<MessageKey, string> = {
  "start.title": "甩锅大战 · PvE",
  "start.difficulty": "AI 难度",
  "start.tutorialTab": "教学",
  "start.desc.1": "Lv1：对手不会读你的行为，也不会 Parry / 假动作",
  "start.desc.2": "Lv2：对手不会读你的行为，但会 Parry / 假动作",
  "start.desc.3": "Lv3：对手会读你的行为，并会 Parry / 假动作",
  "start.desc.tutorial": "引导练习：学习投掷、防守、Parry 和假动作。教学中不会输。",
  "start.startMatch": "开始对战",
  "start.startTutorial": "开始教学",
  "start.controls": "持有文件时：空格 = 投掷，F = 假动作。没有文件时：按住空格 = 防守，按住的前半段是 Parry 窗口。",
  "start.recommended": "新手",
  "start.completed": "已完成",
  "start.firstTitle": "第一次来？",
  "start.firstBody": "简短的引导教学会一步步教你所有动作。",
  "start.firstCta": "开始教学",

  "hud.player": "玩家",
  "hud.opponent": "对手",
  "hud.combo": "连击 x{n}",
  "hud.pause": "暂停",
  "hud.resume": "继续",
  "hud.settings": "设置",
  "hud.docYou": "文件在你手上",
  "hud.docOpp": "文件在对手手上",
  "hud.hint": "持有文件：空格 = 投掷 · F = 假动作  |  没有文件：按住空格 = 防守（前段 = Parry）",
  "hud.san": "SAN",
  "hud.heat": "HEAT",
  "bar.parry": "PARRY",
  "bar.block": "防守",
  "bar.cooldown": "冷静期",

  "PARRY!": "弹反！",
  "Blocked (reduced)": "已防守（减伤）",
  "Blame tossed!": "甩锅成功！",
  "Got hit!": "被击中！",

  "end.win": "你赢了！",
  "end.lose": "你输了",
  "end.doubleLoss": "双输",
  "end.doubleWin": "双赢",
  "end.tosses": "成功投掷：{n}",
  "end.parries": "Parry：{n}",
  "end.blocks": "防守：{n}",
  "end.sanLeft": "剩余 SAN：{n}",
  "end.heat": "HEAT：{n}",
  "end.playAgain": "再来一局",

  "settings.title": "设置",
  "settings.effects": "冲击效果（镜头震动 / 顿帧）",
  "settings.strong": "强",
  "settings.light": "轻",
  "settings.strongDesc": "更大的镜头震动和更长的顿帧，打击感更强。",
  "settings.lightDesc": "较轻的冲击反馈，画面更稳定。",
  "settings.language": "语言",
  "settings.close": "关闭",

  "tut.progress": "第 {n} 步 / 共 {total} 步",
  "tut.continue": "继续",
  "tut.tryIt": "明白了，我来试试",
  "tut.skip": "跳过本步",
  "tut.exit": "退出教学",
  "tut.finish": "开始正式对战",
  "tut.paused": "讲解中，游戏已暂停",
  "tut.slowmo": "慢动作",
  "tut.yourTurn": "轮到你了",
  "tut.nice": "漂亮！",
  "tut.tryAgain": "差一点，自动重试中……",
  "tut.keyHold": "按住",
  "tut.keyPress": "按下",

  "intro-scene.title": "欢迎来到办公室",
  "intro-scene.explain": "两位同事正在互相甩锅，锅就是中间的文件。持有文件的一方通过投掷来进攻，另一方负责防守。现在文件在你手上。",
  "intro-bars.title": "SAN 与 HEAT",
  "intro-bars.explain": "蓝色是 SAN（理智），红色是 HEAT（压力）。受到攻击会降低 SAN、增加 HEAT。SAN 归零或 HEAT 满了就会输。你的数值条在左边，对手的在右边。",
  "intro-timer.title": "计时与操作",
  "intro-timer.explain": "正式对战时长 3 分钟。时间到时双方平局：状态都很差则双输，否则双赢。底部是操作提示：空格和 F。教学期间计时器是冻结的。",
  "toss.title": "投掷文件",
  "toss.explain": "持有文件时，按空格把它扔向对手。对手没有防守时就会命中：对方损失 SAN、增加 HEAT，文件转移到对方手上。",
  "toss.practice": "按空格投掷文件。",
  "toss.success": "命中！看看对手的数值条：SAN 下降，HEAT 上升。文件现在在他手上。",
  "block.title": "防守",
  "block.explain": "对手持有文件时会向你投掷。按空格进入 Parry 窗口；如果错过窗口，就会进入无法主动退出的冷静期。冷静期可以挡住攻击，但会让进攻方承担更重的 SAN 惩罚。",
  "block.practice": "按空格进入 Parry。错过窗口后会自动进入冷静期；松开空格也不能提前解除。",
  "block.success": "防守成功！你只受到了减免后的伤害，文件回到你手里。",
  "parry.title": "Parry（弹反）",
  "parry.explain": "在投掷到达前不久按下空格，投掷就会落在 Parry 窗口里，也就是防守的前半段。Parry 会完全抵消伤害、把文件弹回去，并对进攻方造成更重的惩罚。这里游戏会放慢，方便你掌握时机。",
  "parry.practice": "对手开始蓄力。稍等一下，在投掷到达之前按下空格。",
  "parry.success": "完美弹反！没有受到伤害，进攻方受到了惩罚。",
  "feint.title": "假动作",
  "feint.explain": "持有文件时按 F 可以做出投掷的假动作。什么都不会扔出去，但防守方可能会慌乱地提前举起防御，打乱自己的时机。",
  "feint.practice": "按 F 做假动作。",
  "feint.success": "看到了吗？对手被吓到，提前举起了防御。",
  "penalty.title": "被对手防守",
  "penalty.explain": "如果你向正在防守的对手投掷，就要付出代价：被普通防守会损失 {blockSan} 点 SAN 并增加 {blockHeat} 点 HEAT；被 Parry 会损失 {parrySan} 点 SAN 并增加 {parryHeat} 点 HEAT。先用假动作试探能避免这种情况。",
  "penalty.practice": "对手正在防守。仍然按空格投掷，并观察你自己的数值条。",
  "penalty.success": "被反制了！你的 SAN 下降、HEAT 上升。不要盲目向防守中的对手投掷。",
  "summary.title": "你已经准备好了",
  "summary.explain": "总结：\n- 持有文件时按空格：投掷；没有文件时按空格：进入 Parry。\n- 错过 Parry 后会进入无法主动退出的冷静期。\n- F 用假动作引诱对手提前防守。\n- 被对手防守成功会损失 SAN 并增加 HEAT。\n正式对战将从 Lv1 开始。",

  "fail.notGuarding": "投掷命中时你没有在防守。请在投掷到达之前就开始按住空格。",
  "fail.blockWasParry": "Parry 窗口已经结束，你进入了无法退出的冷静期。",
  "fail.parryTooEarly": "太早了：你已经超过了 Parry 窗口。请在对手蓄力时才按空格。",
  "fail.parryTooLate": "太晚了：你在投掷之后才按下。请在对手蓄力时立刻按空格。",
  "fail.generic": "没有成功，我们再试一次。",
}

const MESSAGES: Record<Lang, Record<string, string>> = { en: EN, zh: ZH }

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const template = MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
}

const langStore = createPersistedStore<Lang>("blame-game:lang", "en", (raw): raw is Lang => raw === "en" || raw === "zh")

export function useLanguage() {
  const lang = useSyncExternalStore(langStore.subscribe, langStore.get, langStore.getServer)
  const t = useCallback(
    (key: MessageKey | (string & {}), params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  )
  return { lang, setLang: langStore.set, t }
}
