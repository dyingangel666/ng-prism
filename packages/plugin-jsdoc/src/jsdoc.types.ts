export interface JsDocTags {
  deprecated?: string | true;
  since?: string;
  see?: string[];
  example?: string[];
}

export interface JsDocData {
  classDescription?: string;
  classTags: JsDocTags;
  memberTags: Record<string, JsDocTags>;
}
