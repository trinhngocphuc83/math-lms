# -*- coding: utf-8 -*-
# Dung src/utils/noiDungHuongDan.ts TU docs/huong-dan-soan-bai.md.
# Mot nguon duy nhat: sua tep .md roi chay lai tep nay (hoac node scratch/dung-huong-dan.mjs,
# hai ban ra cung mot tep).
import io

G = 'D:/claude/math-lms/'
src = io.open(G + 'docs/huong-dan-soan-bai.md', encoding='utf-8').read().replace('\r\n', '\n')

# Bo dong tieu de dau vi hop da co tieu de rieng
body = src.split('\n', 1)[1].lstrip('\n')

# Chuoi template JS: phai chan dau nguoc, dau huyen va ${
esc = body.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

out = (
    u'/**\n'
    u' * Noi dung trang huong dan soan bai - MOT nguon dung cho ca hai cho:\n'
    u' * hop "Huong dan" trong trinh soan va tep docs/huong-dan-soan-bai.md.\n'
    u' *\n'
    u' * SUA O docs/huong-dan-soan-bai.md roi chay python scratch/dung-huong-dan.py\n'
    u' * (hoac node scratch/dung-huong-dan.mjs - hai ban ra cung mot tep),\n'
    u' * dung sua thang tep nay.\n'
    u' */\n\n'
    u'export const NOI_DUNG_HUONG_DAN = `' + esc + u'`;\n'
)
io.open(G + 'src/utils/noiDungHuongDan.ts', 'w', encoding='utf-8', newline='\n').write(out)
print('xong, %d ky tu' % len(esc))
