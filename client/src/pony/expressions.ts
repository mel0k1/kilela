import type { Expression, Eye, Iris, Muzzle } from './pt/interfaces';
import { Eye as E, Iris as I, Muzzle as M, ExpressionExtra } from './pt/interfaces';

type Dict<T> = Record<string, T>;

function createMap<T>(values: unknown[][]): Dict<T> {
  return values.reduce((obj: Dict<T>, row) => {
    const [exp, ...values] = row as [T, ...string[]];

    for (const v of values) {
      obj[v] = exp;
    }

    return obj;
  }, Object.create(null));
}

const THREE_LETTER_WORDS = [
  'ace', 'act', 'ama', 'amp', 'amo', 'amu', 'amy', 'ana', 'ane', 'and', 'ant', 'any', 'ape', 'app', 'apo',
  'apt', 'ava', 'ave', 'avo', 'awe', 'awn', 'awp', 'axe',
  'boa', 'bob', 'bod', 'bog', 'bon', 'boo', 'bop', 'bot', 'boy', 'bub', 'bud', 'bug', 'bup', 'but', 'bun', 'buy',
  'dad', 'doe', 'dog', 'dot', 'doy', 'dna', 'dub', 'dud', 'due', 'dun', 'dug', 'duo', 'dup', 'dva', 'dvd',
  'eco', 'ecu', 'eme', 'emu', 'emo', 'eon', 'end', 'eng', 'eva', 'eve', 'exe', 'exp',
  'gnu', 'goa', 'god', 'gog', 'gon', 'goo', 'got', 'gud', 'gut', 'gun', 'guv', 'guy',
  'nnn', 'nog', 'non', 'noo', 'nop', 'not', 'nun', 'nut', 'nub',
  'oca', 'omo', 'one', 'ooo', 'oot', 'ope', 'opt', 'oud', 'out', 'ova', 'owe', 'own', 'oxo', 'oxe', 'omg',
  'pay', 'pnp', 'pod', 'pon', 'poo', 'pop', 'pot', 'pov', 'ppp', 'pub', 'pud', 'pug', 'pup', 'pun', 'put', 'pvp',
  'qqq', 'que', 'qua',
  'tnt', 'ton', 'top', 'tod', 'toe', 'tog', 'too', 'toy', 'tub', 'tug', 'tun', 'twa', 'two',
  'uuu', 'una', 'und', 'uno', 'ump', 'upo', 'uva',
  'voe', 'voy', 'vpn', 'vug', 'vvv',
  'yay', 'yob', 'yod', 'yon', 'you', 'yup',
];

const TWO_LETTER_WORDS = [
  'ox', 'ex', 'by', 'my', 'up', 'of', 'if', 'me', 'ow', 'am', 'we', 'uh', 'um', 'be', 'em', 'bi', 'oh',
  'go', 'eh', 'ah', 'ye', 'ya', 'he', 'hi', 'ho', 'ha', 'yo', 'us', 'on', 'id', 'an', 'do', 'no',
  'as', 'at', 'it', 'is', 'or', 'so', 'to', 'pc',
];

const threeLetterWords = new RegExp(`^(${THREE_LETTER_WORDS.join('|')})$`);
const twoLetterWords = new RegExp(`^(${TWO_LETTER_WORDS.join('|')})$`);

const double = (items: string[]) => items.map(x => x + x);
const prefix = (items: string[], fix: string) => items.map(x => fix + x);
const suffix = (items: string[], fix: string) => items.map(x => x + fix);

const smilesRight = [')', ']', '}', '>'];
const smilesLeft = ['(', '[', '{', '<', 'C', 'c'];
const flatBoth = ['|', 'i', 'l'];
const concernedBoth = ['/', '\\', 's', 'S', '?'];
const muzzlesBoth = [
  [M.Scrunch, 't', 'T', 'I'],
  [M.Blep, 'P', 'p', 'd'],
  [M.FlatBlep, 'b'],
  [M.Flat, ...flatBoth],
  [M.Concerned, ...concernedBoth],
  [M.ConcernedOpen, '0', 'v'],
  [M.ConcernedOpen2, 'O'],
  [M.Oh, 'o'],
  [M.Kiss, '*', 'x', 'X'],
  [M.NeutralPant, 'L'],
  [M.SmilePant, 'Q'],
  [M.FrownOpen, 'V'],
  [M.NeutralOpen2, 'u', 'n'],
  [M.NeutralOpen3, 'U'],
  [M.NeutralTeeth, ...double(flatBoth)],
  [M.ConcernedTeeth, ...double(concernedBoth)],
];

const muzzlesRight = createMap<Muzzle>([
  ...muzzlesBoth,
  [M.Smile, '3', ...smilesRight],
  [M.Frown, ...smilesLeft],
  [M.SmileOpen, 'D'],
  [M.SmileOpen2, 'DD'],
  [M.SmileOpen3, 'DDD'],
  [M.SmileTeeth, ...double(smilesRight)],
  [M.FrownTeeth, ...double(smilesLeft)],
]);

const muzzlesLeft = createMap<Muzzle>([
  ...muzzlesBoth,
  [M.Smile, ...smilesLeft],
  [M.Frown, ...smilesRight],
  [M.ConcernedOpen2, 'D'],
  [M.ConcernedOpen3, 'DD', 'DDD'],
  [M.SmileTeeth, ...double(smilesLeft)],
  [M.FrownTeeth, ...double(smilesRight)],
]);

const neutralEyes = [';', ':', '=', '%', '8'];

const verticalEyesBoth = [
  [E.Neutral, ...neutralEyes],
  [E.X, 'X', 'x'],
  [E.Neutral3, 'B'],
  [E.Lines, '|'],
];

const verticalEyesRight = createMap<Eye>([
  ...verticalEyesBoth,
  [E.Angry, ...prefix(neutralEyes, '>')],
  [E.Angry2, '>B'],
  [E.Sad, ...prefix(neutralEyes, '<')],
  [E.Sad2, '<B'],
  [E.Frown, ...prefix(neutralEyes, '|')],
  [E.Frown2, '|B'],
]);

const verticalEyesLeft = createMap<Eye>([
  ...verticalEyesBoth,
  [E.Angry, ...suffix(neutralEyes, '<')],
  [E.Sad, ...suffix(neutralEyes, '>')],
  [E.Frown, ...suffix(neutralEyes, '|')],
]);

const horizontalMuzzles = createMap<Muzzle>([
  [M.Smile, 'c', 'C', 'v', 'V', 'u', 'U', 'w', 'W', '👃'],
  [M.SmilePant, 'Q', 'P'],
  [M.Frown, 'n', 'm', '^'],
  [M.Neutral, '-', '//'],
  [M.NeutralPant, 'q', 'p'],
  [M.Flat, '_'],
  [M.Kiss, '.', ',', '*', 'x', 'X', '3'],
  [M.Concerned, '~'],
  [M.ConcernedOpen, 'o'],
  [M.ConcernedOpen2, 'A', 'O', '0'],
]);

const horizontalEyes = [
  [E.Neutral, `'`, '.', '0', '°', 'o', 'O', 'e', 'g', '9', '6', 'd', 'b'],
  [E.Neutral4, '='],
  [E.Closed, '-', 'v', 'V', 'u', 'U', 'y', 'Y'],
  [E.ClosedHappy, 'n'],
  [E.ClosedHappy2, '^'],
  [E.Sad, 'q', 'Q', 'p', 'P', ';', ':', ','],
  [E.Peaceful, 't', 'T'],
  [E.Frown, 'ô', 'Ô', 'õ', 'Õ', 'ō', 'Ō', 'ŏ', 'Ŏ'],
  [E.Frown2, 'a'],
];

const horizontalEyesLeft = createMap<Eye>([
  ...horizontalEyes,
  [E.Neutral2, '>'],
  [E.X, '<'],
  [E.Sad, 'ò', 'Ò'],
  [E.Angry, 'ó', 'Ó'],
]);

const horizontalEyesRight = createMap<Eye>([
  ...horizontalEyes,
  [E.Neutral2, '<'],
  [E.X, '>'],
  [E.Sad, 'ó', 'Ó'],
  [E.Angry, 'ò', 'Ò'],
]);

const horizontalIrises = createMap<Iris>([
  [I.Up, '9'],
  [I.UpLeft, 'e'],
  [I.UpRight, 'g'],
  [I.Right, '<', 'd'],
  [I.Left, '>', 'b'],
]);

const muzzleToEye: Eye[] = [];
muzzleToEye[M.Frown] = E.Sad;
muzzleToEye[M.FrownOpen] = E.Sad;
muzzleToEye[M.ConcernedOpen2] = E.Sad;
muzzleToEye[M.ConcernedOpen3] = E.Sad;

const neutralToSmile: Muzzle[] = [];
neutralToSmile[M.ConcernedOpen] = M.SmileOpen2;
neutralToSmile[M.ConcernedOpen2] = M.SmileOpen3;

function any(obj: object) {
  return `(${Object.keys(obj).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
}

const bigEyes = /[O0ÒÓÔÕŌŎQ]/;
const cryingEye = /[;pqPQTyY]/;
const tears = "(['`,]?)";
const tearsRegex = /['`,]/;
const verticalRightRegex = new RegExp(`^${any(verticalEyesRight)}${tears}-?${any(muzzlesRight)}$`);
const verticalLeftRegex = new RegExp(`^${any(muzzlesLeft)}-?${tears}${any(verticalEyesLeft)}$`);
const horizontalRegex = new RegExp(`^${any(horizontalEyesRight)}(//)?${any(horizontalMuzzles)}(//)?${any(horizontalEyesLeft)}$`);

function matchVertical(
  text: string, regex: RegExp, flip: boolean, muzzleMap: Dict<Muzzle>, eyesMap: Dict<Eye>,
): Expression | undefined {
  if (/^([|]{2,}|BS|8x|x8|x-?x|\d+)$/i.test(text)) return undefined;

  const match = regex.exec(text);

  if (!match) return undefined;

  const eyesStr = flip ? match[3] : match[1];
  const muzzleStr = flip ? match[1] : match[3];
  const muzzle = muzzleMap[muzzleStr];
  const veye = eyesMap[eyesStr];
  const eye = veye === E.Neutral && !/[OV]/.test(muzzleStr) ? (muzzleToEye[muzzle] || veye) : veye;
  const blink = /;/.test(eyesStr);
  const tear = blink && muzzleToEye[muzzle] === E.Sad;
  const left = tear ? (/[<>]/.test(eyesStr) ? eye : E.Sad2) : (blink && flip ? E.Closed : eye);
  const right = tear ? (/[<>]/.test(eyesStr) ? eye : E.Sad2) : (blink && !flip ? E.Closed : eye);
  const shocked = /8/.test(eyesStr);
  const rightIris = shocked ? I.Shocked : I.Forward;
  const leftIris = shocked ? I.Shocked : (/%/.test(eyesStr) ? I.Up : I.Forward);
  const extra = (tearsRegex.test(match[2]) || tear) ? ExpressionExtra.Tears : ExpressionExtra.None;

  return { right, left, muzzle, rightIris, leftIris, extra };
}

function matchHorizontal(text: string): Expression | undefined {
  if (/\.\.|--|vv|uu|qq|pp|nn|^\d+$/i.test(text)) return undefined;

  if (/[a-zA-Z][a-z][a-z]|[A-Z]{3}/.test(text)) {
    const clear = text.replace(/[^a-z]/ig, '').toLowerCase();

    if (clear.length === 3 && threeLetterWords.test(clear)) return undefined;
  }

  if (/[a-z][a-z][.,*-]/i.test(text)) {
    const clear = text.replace(/[^a-z]/ig, '').toLowerCase();

    if (clear.length === 2 && twoLetterWords.test(clear)) return undefined;
  }

  const match = horizontalRegex.exec(text);

  if (!match) return undefined;

  const [, rightStr, rightBlush, muzzleStr, leftBlush, leftStr] = match;

  if ((rightBlush || leftBlush) && rightBlush !== leftBlush) return undefined;

  const leftEye = horizontalEyesLeft[leftStr];
  const rightEye = horizontalEyesRight[rightStr];
  const muzzle = horizontalMuzzles[muzzleStr];
  const same = rightStr === leftStr;
  const lookingToSide = same && /[<>]/.test(rightStr);
  const shocked = bigEyes.test(leftStr) && bigEyes.test(rightStr) && rightStr !== '0' && leftStr !== '0';
  const lookingDown = (same && rightStr === '6') || (rightStr === 'b' && leftStr === 'd');
  const unamused = !lookingDown && same && rightStr === '-' && /[.,_]/.test(muzzleStr);
  const left = (lookingToSide || (leftStr === 'o' && bigEyes.test(rightStr))) ? E.Neutral2 : leftEye;
  const right = (lookingToSide || (rightStr === 'o' && bigEyes.test(leftStr))) ? E.Neutral2 : rightEye;
  const blush = /[/][/]/.test(muzzleStr) || (rightBlush && rightBlush === leftBlush);
  const cry = cryingEye.test(leftStr) || cryingEye.test(rightStr);

  return {
    left: unamused ? E.Frown2 : left,
    right: unamused ? E.Frown2 : right,
    muzzle: same && (leftEye === E.ClosedHappy || leftEye === E.ClosedHappy2) ? (neutralToSmile[muzzle] || muzzle) : muzzle,
    rightIris: lookingDown ? I.Down : (shocked ? I.Shocked : (horizontalIrises[rightStr] || I.Forward)),
    leftIris: lookingDown ? I.Down : (shocked ? I.Shocked : (horizontalIrises[leftStr] || I.Forward)),
    extra: (blush ? ExpressionExtra.Blush : ExpressionExtra.None) | (cry ? ExpressionExtra.Cry : ExpressionExtra.None),
  };
}

function expression(
  right: Eye, left: Eye, muzzle: Muzzle,
  rightIris: Iris = I.Forward, leftIris: Iris = I.Forward, extra = ExpressionExtra.None,
): Expression {
  return { right, left, muzzle, rightIris, leftIris, extra };
}

const constants: Dict<() => Expression | undefined> = {
  '^^': () => expression(E.ClosedHappy2, E.ClosedHappy2, M.Smile),
  '))': () => expression(E.Neutral, E.Neutral, M.Smile),
  '((': () => expression(E.Neutral, E.Neutral, M.Frown),
  '>>': () => expression(E.Neutral2, E.Neutral2, M.Flat, I.Left, I.Left),
  '<<': () => expression(E.Neutral2, E.Neutral2, M.Flat, I.Right, I.Right),
  '🙂': () => expression(E.Neutral, E.Neutral, M.Smile),
  '😵': () => expression(E.Neutral, E.Neutral, M.Smile, I.Up, I.Forward),
  '😐': () => expression(E.Neutral, E.Neutral, M.Flat),
  '😑': () => expression(E.Lines, E.Lines, M.Flat),
  '😆': () => expression(E.X, E.X, M.SmileOpen),
  '😟': () => expression(E.Sad, E.Sad, M.Neutral),
  '😠': () => expression(E.Angry, E.Angry, M.Smile),
  '🤔': () => expression(E.Neutral, E.Frown2, M.Concerned),
  '😈': () => expression(E.Angry, E.Angry, M.Smile, I.Up, I.Forward),
  '👿': () => expression(E.Angry, E.Angry, M.SmileTeeth),
};

function matchOther(text: string): Expression | undefined {
  if (/^A{5,}\.*$/.test(text)) {
    return expression(E.Neutral, E.Neutral, M.ConcernedOpen3, I.Shocked, I.Shocked);
  } else if (/^a{5,}\.*$/.test(text)) {
    return expression(E.Neutral, E.Neutral, M.ConcernedOpen3);
  } else if (/^z{3,}\.*$/i.test(text)) {
    return expression(E.Closed, E.Closed, M.Neutral);
  }

  return constants[text] && constants[text]();
}

const charMap: Dict<string> = {
  'З': '3', 'з': '3', 'Э': '3', 'э': '3',
  'А': 'A', 'а': 'a', 'Д': 'A', 'д': 'A',
  'В': 'B', 'в': 'B',
  'Г': 'L',
  'М': 'M', 'м': 'M',
  'О': 'O', 'о': 'o',
  'П': 'n', 'п': 'n',
  'Р': 'P', 'р': 'p',
  'С': 'C', 'с': 'c',
  'Т': 'T', 'т': 'T',
  'Х': 'X', 'х': 'x',
  'Ш': 'W', 'ш': 'w',
  'Ь': 'b', 'ь': 'b',
  'е': 'e',
  'у': 'y', 'У': 'Y',
};

const charRegex = new RegExp(`[${Object.keys(charMap).join('')}]`, 'g');

function replaceRussian(text: string): string {
  return text.replace(charRegex, x => charMap[x]);
}

function matchExpression(text: string): Expression | undefined {
  if (/тот/ui.test(text)) return undefined;

  text = replaceRussian(text)
    .replace(/D{4,}/, 'DDD')
    .replace(/\\/g, '/')
    .replace(/\/{3,}/g, '//');

  return matchVertical(text, verticalRightRegex, false, muzzlesRight, verticalEyesRight)
    || matchVertical(text, verticalLeftRegex, true, muzzlesLeft, verticalEyesLeft)
    || matchHorizontal(text)
    || matchOther(text);
}

export function parseChatExpression(text: string): Expression | undefined {
  const emoteMatch = /(?:^| )(\S+)\s*$/.exec(text);
  const emote = emoteMatch && emoteMatch[1].trim();
  return emote ? matchExpression(emote) : undefined;
}
