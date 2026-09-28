/**
 * Chrome and Safari break Thai lines with ICU's dictionary, which does not know these loanwords and place
 * names, so they split mid-word ('อินสตาแก|รม', 'แซมด|อกสต็อก'). keepWords() puts U+2060 WORD JOINER between
 * the word's clusters, never before a vowel or tone mark (a joiner there shows a dotted circle). It adds
 * U+200B only on a side that touches another Thai letter, so the line can still break before and after the
 * word. Pure string work: the server and the client give the same output. Use it on display text only,
 * never on alt, aria-label, metadata or stored data.
 */
const KEEP = ['อินสตาแกรม', 'โซเชียล', 'อัปโหลด', 'ดอกสต็อก', 'ไฮเปอริคัม', 'ทุ่งวัดดอน'];
const WJ = '⁠';
const ZWSP = '​';
const MARK = /[ัำ-ฺ็-๎]/;
const THAI = /[ก-๛]/;
const RE = new RegExp(KEEP.join('|'), 'g');
const glue = (w: string) => [...w].map((c, i) => (i && !MARK.test(c) ? WJ : '') + c).join('');
export const keepWords = (s: string) =>
  s.replace(RE, (w: string, at: number) => (THAI.test(s[at - 1] ?? '') ? ZWSP : '') + glue(w) + (THAI.test(s[at + w.length] ?? '') ? ZWSP : ''));
