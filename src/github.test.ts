import {
  getWorkflowRunStep,
  uploadTraceLogArtifact,
  ListJobsForWorkflowRunType,
  WorkflowRunStep,
  WorkflowRunJob,
} from "./github";
import { Octokit } from "@octokit/rest";
import { Context } from "@actions/github/lib/context";
import { mock, mockDeep } from "jest-mock-extended";
import { ArtifactClient } from "@actions/artifact";

describe("github.ts", () => {
  let mockContext: Context;
  let mockOctokit: Octokit;
  beforeEach(() => {
    mockContext = mockDeep<Context>();
    mockOctokit = mockDeep<Octokit>();
  });

  describe("listJobsForWorkflowRun", () => {
    let subject: WorkflowRunStep | undefined;
    const runId = 1;
    const jobName = "lint-and-format-check";
    const stepName = "run tests";

    beforeEach(async () => {
      const mockListJobsForWorkflowRun = mockOctokit.rest.actions
        .listJobsForWorkflowRun as jest.MockedFunction<
        typeof mockOctokit.rest.actions.listJobsForWorkflowRun
      >;

      mockListJobsForWorkflowRun.mockResolvedValue(
        mock<ListJobsForWorkflowRunType>({
          data: {
            total_count: 1,
            jobs: [
              mock<WorkflowRunJob>({
                id: runId,
                name: jobName,
                steps: [
                  mock<WorkflowRunStep>({
                    name: stepName,
                  }),
                ],
              }),
            ],
          },
        })
      );

      subject = await getWorkflowRunStep({
        context: mockContext,
        octokit: mockOctokit,
        runId,
        jobName,
        stepName,
      });
    });

    it("returns expected results", () => {
      expect(subject).toBeDefined();
      expect(subject?.name).toEqual("run tests");
    });
  });

  describe("uploadTraceLogArtifact", () => {
    let mockArtifactClient: ArtifactClient;
    const jobName = "lint-and-format-check";
    const stepName = "run tests";
    const filePath = "trace.log";

    beforeEach(() => {
      mockArtifactClient = mockDeep<ArtifactClient>();
    });

    it("successfully uploads artifact", async () => {
      const mockUploadArtifact =
        // eslint-disable-next-line @typescript-eslint/unbound-method
        mockArtifactClient.uploadArtifact as jest.MockedFunction<
          typeof mockArtifactClient.uploadArtifact
        >;
      mockUploadArtifact.mockResolvedValue({
        id: 1,
        size: 1024,
      });
      await uploadTraceLogArtifact({
        jobName,
        stepName,
        path: filePath,
        artifactClient: mockArtifactClient,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockUploadArtifact).toBeCalledWith(
        `{${jobName}}{${stepName}}`,
        [filePath],
        "."
      );
    });

    it("throws error when upload fails", async () => {
      (
        mockArtifactClient.uploadArtifact as jest.MockedFunction<
          typeof mockArtifactClient.uploadArtifact
        >
      ).mockRejectedValue(new Error("Upload failed"));

      await expect(
        uploadTraceLogArtifact({
          jobName,
          stepName,
          path: filePath,
          artifactClient: mockArtifactClient,
        })
      ).rejects.toThrowError("Upload failed");
    });
  });
});
