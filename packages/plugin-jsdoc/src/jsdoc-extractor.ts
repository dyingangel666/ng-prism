import { readFileSync } from 'node:fs';
import ts from 'typescript';
import type { JsDocData, JsDocTags } from './jsdoc.types.js';

export function extractJsDocData(filePath: string, className: string): JsDocData | null {
  const sourceText = readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ES2022, true);

  const classDecl = findClassByName(sourceFile, className);
  if (!classDecl) return null;

  return {
    classDescription: extractDescription(classDecl),
    classTags: extractTags(classDecl),
    memberTags: extractAllMemberTags(classDecl),
  };
}

function findClassByName(sourceFile: ts.SourceFile, className: string): ts.ClassDeclaration | null {
  let found: ts.ClassDeclaration | null = null;

  function visit(node: ts.Node): void {
    if (found) return;
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

function extractDescription(node: ts.Node): string | undefined {
  const jsDocNodes = (node as any).jsDoc as ts.JSDoc[] | undefined;
  if (!jsDocNodes?.length) return undefined;

  const lastDoc = jsDocNodes[jsDocNodes.length - 1];
  const comment = lastDoc.comment;
  if (!comment) return undefined;

  if (typeof comment === 'string') return comment.trim() || undefined;

  return (comment as ts.NodeArray<ts.JSDocComment>)
    .map((c) => (typeof c === 'string' ? c : c.text))
    .join('')
    .trim() || undefined;
}

function extractTags(node: ts.Node): JsDocTags {
  const tags = ts.getJSDocTags(node);
  return buildTagsFromList(tags);
}

function buildTagsFromList(tags: readonly ts.JSDocTag[]): JsDocTags {
  const result: JsDocTags = {};

  for (const tag of tags) {
    const tagName = tag.tagName.text;
    const comment = tagCommentToString(tag.comment);

    if (tagName === 'deprecated') {
      result.deprecated = comment || true;
    } else if (tagName === 'since') {
      result.since = comment;
    } else if (tagName === 'see') {
      const seeRef = extractSeeReference(tag, comment);
      if (seeRef) result.see = [...(result.see ?? []), seeRef];
    } else if (tagName === 'example') {
      result.example = [...(result.example ?? []), ...(comment ? [comment] : [])];
    }
  }

  return result;
}

function extractSeeReference(tag: ts.JSDocTag, comment: string | undefined): string | undefined {
  const seeTag = tag as any;
  const nameRef: string | undefined = seeTag.name?.name?.text ?? seeTag.name?.left?.text;
  if (nameRef) return nameRef;
  if (comment && comment !== '*') return comment;
  return undefined;
}

function tagCommentToString(comment: string | ts.NodeArray<ts.JSDocComment> | undefined): string | undefined {
  if (!comment) return undefined;
  if (typeof comment === 'string') return comment.trim() || undefined;
  return (comment as ts.NodeArray<ts.JSDocComment>)
    .map((c) => (typeof c === 'string' ? c : c.text))
    .join('')
    .trim() || undefined;
}

function extractAllMemberTags(classDecl: ts.ClassDeclaration): Record<string, JsDocTags> {
  const result: Record<string, JsDocTags> = {};

  for (const member of classDecl.members) {
    const name = getMemberName(member);
    if (!name) continue;

    const tags = ts.getJSDocTags(member);
    if (tags.length === 0) continue;

    result[name] = buildTagsFromList(tags);
  }

  return result;
}

function getMemberName(member: ts.ClassElement): string | undefined {
  if (!member.name) return undefined;
  if (ts.isIdentifier(member.name)) return member.name.text;
  if (ts.isStringLiteral(member.name)) return member.name.text;
  return undefined;
}
