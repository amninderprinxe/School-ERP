export type ActionResult = {
  success: boolean;
  data?: {
    map(arg0: (s: any) => any): Iterable<string>;
    created: number;
    id?: string;
  };
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
