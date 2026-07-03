const fs = require('fs');
let code = fs.readFileSync('src/app/student/lessons/[id]/AzotaExamUI.tsx', 'utf8');

const targetStr = `      for (let i = 0; i < essayTasks.length; i++) {
        const task = essayTasks[i];
        const qIndex = task.qIndex;

        const previousResult = gradingStatus[qIndex]?.result;
        if (previousResult && typeof previousResult.scoreNumber === 'number' && !previousResult.error && !previousResult.feedback?.includes('Lỗi')) {
            const earned = Math.min(previousResult.scoreNumber, task.maxScore);
            essayTotalScore += earned;
            updatedScores[qIndex] = { earned, max: task.maxScore };
            setGradingStatus(prev => ({ ...prev, [qIndex]: { isGrading: false, result: previousResult } }));
            finalGradingDetails.push({
               qIndex: task.qIndex,
               type: 'essay',
               question: task.data.question,
               sampleAnswer: task.data.answer || (task.data.phuong_phap_giai ? \`PP Giải: \${task.data.phuong_phap_giai}\\nCác bước: \${(task.data.cac_buoc_thuc_hien || []).join('\\n')}\` : ''),
               maxScore: task.maxScore,
               score: earned,
               passed: previousResult.passed,
               feedback: previousResult.feedback,
               images: answers[qIndex.toString()]?.images || []
            });
            continue;
        }
        try {
          const result = await gradeOneEssay(qIndex, task.data, task.maxScore);
          setGradingStatus(prev => ({ ...prev, [qIndex]: { isGrading: false, result } }));
          const earned = typeof result.scoreNumber === 'number' ? Math.min(result.scoreNumber, task.maxScore) : 0;
          updatedScores[qIndex] = { earned, max: task.maxScore };
          essayTotalScore += earned;
          setQuestionScores({ ...updatedScores });
          setScore(Math.round((immediateScore + essayTotalScore) * 100) / 100);
          finalGradingDetails.push({
             qIndex: task.qIndex,
             type: 'essay',
             question: task.data.question,
             sampleAnswer: task.data.answer || (task.data.phuong_phap_giai ? \`PP Giải: \${task.data.phuong_phap_giai}\\nCác bước: \${(task.data.cac_buoc_thuc_hien || []).join('\\n')}\` : ''),
             maxScore: task.maxScore,
             score: earned,
             passed: result.passed,
             feedback: result.feedback,
             images: answers[qIndex.toString()]?.images || []
          });
          
          if (i < essayTasks.length - 1) await sleep(1500);
        } catch (err: any) {
          setGradingStatus(prev => ({ ...prev, [qIndex]: { isGrading: false, result: { scoreNumber: 0, passed: false, feedback: \`Lỗi: \${err.message}\`, score: \`0/\${task.maxScore.toFixed(2)}\` } } }));
          updatedScores[qIndex] = { earned: 0, max: task.maxScore };
          finalGradingDetails.push({
             qIndex: task.qIndex,
             type: 'essay',
             question: task.data.question,
             sampleAnswer: task.data.answer || (task.data.phuong_phap_giai ? \`PP Giải: \${task.data.phuong_phap_giai}\\nCác bước: \${(task.data.cac_buoc_thuc_hien || []).join('\\n')}\` : ''),
             maxScore: task.maxScore,
             score: 0,
             passed: false,
             feedback: \`Lỗi hệ thống: \${err.message}\`,
             images: answers[qIndex.toString()]?.images || []
          });
        }
      }`;

const newStr = `      const CHUNK_SIZE = 3;
      for (let i = 0; i < essayTasks.length; i += CHUNK_SIZE) {
        const chunk = essayTasks.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (task) => {
          const qIndex = task.qIndex;

          const previousResult = gradingStatus[qIndex]?.result;
          if (previousResult && typeof previousResult.scoreNumber === 'number' && !previousResult.error && !previousResult.feedback?.includes('Lỗi')) {
              const earned = Math.min(previousResult.scoreNumber, task.maxScore);
              essayTotalScore += earned;
              updatedScores[qIndex] = { earned, max: task.maxScore };
              setGradingStatus(prev => ({ ...prev, [qIndex]: { isGrading: false, result: previousResult } }));
              finalGradingDetails.push({
                 qIndex: task.qIndex,
                 type: 'essay',
                 question: task.data.question,
                 sampleAnswer: task.data.answer || (task.data.phuong_phap_giai ? \`PP Giải: \${task.data.phuong_phap_giai}\\nCác bước: \${(task.data.cac_buoc_thuc_hien || []).join('\\n')}\` : ''),
                 maxScore: task.maxScore,
                 score: earned,
                 passed: previousResult.passed,
                 feedback: previousResult.feedback,
                 images: answers[qIndex.toString()]?.images || []
              });
              return;
          }
          try {
            const result = await gradeOneEssay(qIndex, task.data, task.maxScore);
            setGradingStatus(prev => ({ ...prev, [qIndex]: { isGrading: false, result } }));
            const earned = typeof result.scoreNumber === 'number' ? Math.min(result.scoreNumber, task.maxScore) : 0;
            updatedScores[qIndex] = { earned, max: task.maxScore };
            essayTotalScore += earned;
            setQuestionScores({ ...updatedScores });
            setScore(Math.round((immediateScore + essayTotalScore) * 100) / 100);
            finalGradingDetails.push({
               qIndex: task.qIndex,
               type: 'essay',
               question: task.data.question,
               sampleAnswer: task.data.answer || (task.data.phuong_phap_giai ? \`PP Giải: \${task.data.phuong_phap_giai}\\nCác bước: \${(task.data.cac_buoc_thuc_hien || []).join('\\n')}\` : ''),
               maxScore: task.maxScore,
               score: earned,
               passed: result.passed,
               feedback: result.feedback,
               images: answers[qIndex.toString()]?.images || []
            });
          } catch (err: any) {
            setGradingStatus(prev => ({ ...prev, [qIndex]: { isGrading: false, result: { scoreNumber: 0, passed: false, feedback: \`Lỗi: \${err.message}\`, score: \`0/\${task.maxScore.toFixed(2)}\` } } }));
            updatedScores[qIndex] = { earned: 0, max: task.maxScore };
            finalGradingDetails.push({
               qIndex: task.qIndex,
               type: 'essay',
               question: task.data.question,
               sampleAnswer: task.data.answer || (task.data.phuong_phap_giai ? \`PP Giải: \${task.data.phuong_phap_giai}\\nCác bước: \${(task.data.cac_buoc_thuc_hien || []).join('\\n')}\` : ''),
               maxScore: task.maxScore,
               score: 0,
               passed: false,
               feedback: \`Lỗi hệ thống: \${err.message}\`,
               images: answers[qIndex.toString()]?.images || []
            });
          }
        }));
        if (i + CHUNK_SIZE < essayTasks.length) await sleep(1000);
      }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, newStr);
    fs.writeFileSync('src/app/student/lessons/[id]/AzotaExamUI.tsx', code);
    console.log('Successfully patched AzotaExamUI.tsx!');
} else {
    console.log('Target string not found!');
}
