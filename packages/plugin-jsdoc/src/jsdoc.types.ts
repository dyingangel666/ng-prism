export interface JsDocTags {
  deprecated?: string | true;
  since?: string;
  version?: string;
  see?: string[];
  example?: string[];
}

export interface MethodDoc {
  name: string;
  description?: string;
  tags: JsDocTags;
  params: ParamDoc[];
  returnType?: string;
}

export interface ParamDoc {
  name: string;
  type?: string;
  description?: string;
}

export interface JsDocData {
  classDescription?: string;
  classTags: JsDocTags;
  memberTags: Record<string, JsDocTags>;
  methods?: MethodDoc[];
}
