const text = "`quiz\r\n{\r\n}\r\n`";
const regex = /`quiz[ \t]*\r?\n([\s\S]*?)\r?\n`/g;
console.log(regex.exec(text) !== null ? 'MATCHED' : 'FAILED');
