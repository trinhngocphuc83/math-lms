import sys

filepath = r'D:\APP LMS\math-lms\src\app\student\lessons\[id]\AzotaExamUI.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Import Camera
for i, line in enumerate(lines):
    if 'import { CheckCircle2' in line and 'Camera' not in line:
        lines[i] = line.replace('import { CheckCircle2', 'import { Camera, CheckCircle2')
        break

# 2. Khai báo hasEssay sau getQuestionType
insert_idx = -1
for i, line in enumerate(lines):
    if 'const isQuestionAnswered =' in line:
        insert_idx = i
        break

if insert_idx != -1:
    lines.insert(insert_idx, "  const hasEssay = useMemo(() => parts.some(p => p.type === 'quiz' && getQuestionType(p.content) === 'essay'), [parts]);\n\n")

# 3. Sửa chỗ dùng essayTasks.length > 0 ở phần Global Upload
for i, line in enumerate(lines):
    if '{!isSubmitted && essayTasks.length > 0 && (' in line:
        lines[i] = line.replace('essayTasks.length > 0', 'hasEssay')
        break

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Typescript Fixed Successfully!")
