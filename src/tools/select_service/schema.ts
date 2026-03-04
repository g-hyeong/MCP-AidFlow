import { z } from "zod";

export const SelectServiceInputSchema = z.object({
  action: z
    .enum(["list", "select", "status"])
    .default("list")
    .describe("list: 서비스 목록 조회, select: 서비스 선택, status: 현재 선택 상태 확인"),
  service: z
    .string()
    .optional()
    .describe('선택할 서비스명 (action이 "select"일 때 필수)'),
  session: z
    .string()
    .optional()
    .describe("서비스를 바인딩할 세션명. 미지정 시 글로벌 선택"),
  workspacePath: z
    .string()
    .optional()
    .describe("서비스 탐색 기준 디렉토리. 미지정 시 워크스페이스 루트 사용"),
});

export type SelectServiceInput = z.infer<typeof SelectServiceInputSchema>;
