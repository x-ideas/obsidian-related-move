import { fs } from 'memfs';

export default fs;

const existsSync = fs.existsSync;
export { existsSync };
