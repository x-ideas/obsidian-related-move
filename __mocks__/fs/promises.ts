import { fs } from 'memfs';

export default fs.promises;

const mkdir = fs.promises.mkdir;
const writeFile = fs.promises.writeFile;
export { mkdir, writeFile };
