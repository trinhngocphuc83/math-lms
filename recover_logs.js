const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\\\Users\\\\Admin\\\\.gemini\\\\antigravity\\\\brain\\\\1751080d-e533-4f3c-a998-7600e01838f9\\\\.system_generated\\\\logs\\\\transcript_full.jsonl';
const outDir = path.join(__dirname, 'recovered_from_logs');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

async function scanLogs() {
    console.log("Scanning logs...");
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const fileContents = {}; // store latest content

    for await (const line of rl) {
        try {
            const step = JSON.parse(line);
            
            // Tìm Tool Calls (vd write_to_file)
            if (step.tool_calls && step.tool_calls.length > 0) {
                for (const call of step.tool_calls) {
                    if (call.name === 'write_to_file' || call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
                        let targetFile = call.args.TargetFile || call.args.TargetFile;
                        let codeContent = call.args.CodeContent || call.args.ReplacementContent;
                        if (targetFile && codeContent) {
                            // Làm sạch targetFile
                            let cleanPath = targetFile.replace(/\\\\/g, '/').replace(/"/g, '');
                            if (cleanPath.includes('src/')) {
                                let key = cleanPath.substring(cleanPath.indexOf('src/'));
                                if (!fileContents[key]) fileContents[key] = [];
                                fileContents[key].push({
                                    type: 'write_to_file',
                                    step: step.step_index,
                                    content: codeContent
                                });
                            }
                        }
                    }
                }
            }

            // Tìm Tool Response (từ view_file)
            if (step.type === 'PLANNER_RESPONSE' && step.output) {
               // Có thể ở dạng tool response in ra nội dung
               // Antigravity log system format might vary.
               // We will look for view_file tool calls in PLANNER_RESPONSE but tool outputs are typically in the next step.
            }
            
            // Tìm trong text output "File Path: "
            if (step.content && step.content.includes('File Path: ')) {
                // ...
            }

        } catch (e) {
            // ignore JSON parse errors
        }
    }
    
    // Xuất ra file json để kiểm tra
    const summary = {};
    for (const [filepath, versions] of Object.entries(fileContents)) {
        summary[filepath] = versions.length + " versions";
        // Lấy bản mới nhất
        const latest = versions[versions.length - 1];
        const destPath = path.join(outDir, filepath.replace(/[\\/\\\\]/g, '_'));
        fs.writeFileSync(destPath, latest.content, 'utf8');
    }
    
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.log("Done extracting. Check recovered_from_logs folder!");
}

scanLogs();
