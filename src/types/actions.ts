export type ActionResult = {
  success: boolean;
  data?: {
    id?: string;
  };
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
