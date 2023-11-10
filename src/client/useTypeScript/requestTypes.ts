import ts from 'typescript';

export type AutocompleteRequest = {
  event: 'autocomplete-request';
  fileName: string;
  fileContent: string;
  position: number;
  requestId: string;
};

export type AutocompleteResponse = {
  event: 'post-completions';
  completions: any;
  requestId: string;
};

export type LinterRequest = {
  event: 'lint-request';
  fileName: string;
  fileContent: string;
  requestId: string;
};

export type LinterResponse = {
  event: 'post-error-linter';
  tsErrors: ts.Diagnostic[];
  requestId: string;
};
