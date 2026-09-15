// Áp cùng phép dọn của don-loi-giai-l10c3.mjs lên hai bản thảo đầy đủ trong scratch.
import { readFileSync, writeFileSync } from 'fs';
for (const p of ['scratch/lt-l10c3-bai1-day-du.md', 'scratch/lt-l10c3-bai2-day-du.md']) {
  let n = 0;
  const ra = readFileSync(p, 'utf8').replace(/```quiz\n([\s\S]*?)```/g, (khoi, than) => {
    let q; try { q = JSON.parse(than); } catch { return khoi; }
    const coBuoc = !!q.phuong_phap_giai || (Array.isArray(q.cac_buoc_thuc_hien) && q.cac_buoc_thuc_hien.length > 0);
    if (!coBuoc || !q.answer) return khoi;
    if (q.type === 'essay') { delete q.phuong_phap_giai; delete q.cac_buoc_thuc_hien; } else delete q.answer;
    n++;
    return '```quiz\n' + JSON.stringify(q, null, 2) + '\n```';
  });
  writeFileSync(p, ra); console.log(p, n);
}
