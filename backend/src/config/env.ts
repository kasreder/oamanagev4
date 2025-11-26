import dotenv from 'dotenv';
import path from 'path';

// 프로젝트 루트(backend) 디렉터리의 .env 파일을 명시적으로 로드합니다.
// 현재 작업 디렉터리가 어디든 동일한 파일을 읽도록 경로를 고정합니다.
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});
