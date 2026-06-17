const text = "`quiz\r\n{\r\n}\r\n`";
const regex = /`quiz\n([\s\S]*?)\n`/g;
console.log(regex.exec(text) !== null ? 'MATCHED' : 'FAILED');
