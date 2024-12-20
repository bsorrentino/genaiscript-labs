var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// genaisrc/commenter.common.mts
async function processCode(lang, c, nodes) {
  let numberOfAppliedComment = 0;
  let childFound = c.gotoFirstChild();
  let prevEndRow = 0;
  const addEmptyLines = () => {
    const numEmptyRows = c.startPosition.row - prevEndRow;
    for (let row = 0; row < numEmptyRows - 1; ++row) {
      nodes.push({
        startIndex: c.startIndex,
        endIndex: c.startIndex,
        text: ""
      });
    }
  };
  while (childFound) {
    const { nodeType, startIndex, endIndex, startPosition, endPosition } = c;
    console.log(
      `nodeType: ${nodeType}, startIndex: ${startIndex}, endIndex: ${endIndex}, startPosition (row: ${startPosition.row}, column: ${startPosition.column}), endPosition: (row: ${endPosition.row}, column: ${endPosition.column})`
    );
    addEmptyLines();
    let metadata = {
      startIndex: c.startIndex,
      endIndex: c.endIndex,
      text: c.currentNode.text
    };
    const decl = lang.declarationsToEvaluate.find((d) => d.test(c));
    if (decl) {
      if (await decl.processMetaData(c, metadata)) {
        ++numberOfAppliedComment;
      }
    }
    nodes.push(metadata);
    prevEndRow = c.endPosition.row;
    childFound = c.gotoNextSibling();
  }
  return numberOfAppliedComment > 0;
}
var contentFromResult, spaces, insertString;
var init_commenter_common = __esm({
  "genaisrc/commenter.common.mts"() {
    contentFromResult = (result) => result.fences && result.fences.length === 1 ? result.fences[0].content : result.text;
    spaces = (length) => " ".repeat(length);
    insertString = (original, insert, position) => `${original.slice(0, position)}${insert}${original.slice(position)}`;
  }
});

// genaisrc/commenter.typescript.mts
var commenter_typescript_exports = {};
__export(commenter_typescript_exports, {
  declarationsToEvaluate: () => declarationsToEvaluate
});
var isLexicalDecl, isExportStatementDecl, isTypeAliasDecl, isInterfaceDecl, isFunctionDecl, isArrowFunctionDecl, isCommented, _comment, commentFromResult, processDeclaration, declarationsToEvaluate;
var init_commenter_typescript = __esm({
  "genaisrc/commenter.typescript.mts"() {
    init_commenter_common();
    isLexicalDecl = (c) => c.nodeType === "lexical_declaration";
    isExportStatementDecl = (c) => c.nodeType === "export_statement";
    isTypeAliasDecl = (c) => {
      if (c.nodeType === "type_alias_declaration") {
        return true;
      }
      return isExportStatementDecl(c) ? c.currentNode.descendantsOfType("type_alias_declaration").length > 0 : false;
    };
    isInterfaceDecl = (c) => {
      if (c.nodeType === "interface_declaration") {
        return true;
      }
      return isExportStatementDecl(c) ? c.currentNode.descendantsOfType("interface_declaration").length > 0 : false;
    };
    isFunctionDecl = (c) => {
      if (c.nodeType === "function_declaration") {
        return true;
      }
      return isExportStatementDecl(c) ? c.currentNode.descendantsOfType("function_declaration").length > 0 : false;
    };
    isArrowFunctionDecl = (c) => {
      if (isLexicalDecl(c) || isExportStatementDecl(c)) {
        return c.currentNode.descendantsOfType("arrow_function").length > 0;
      }
      return false;
    };
    isCommented = (c) => {
      let result = false;
      if (c.gotoPreviousSibling()) {
        result = c.nodeType === "comment";
        const endIndexOfComment = c.endIndex;
        c.gotoNextSibling();
        result = result && c.startIndex <= endIndexOfComment + 1;
      }
      return result;
    };
    _comment = async ({ text: content, type: declarationType }) => await runPrompt(
      (_) => {
        _.$`Comment the first typescript ${declarationType} declaration in provided CODE using JSDoc standard format. 
            Follows the rules below:
            - Result MUST contains exclusively one complete JSDoc comment and nothing else.
            - Result MUST NOT contains any Typescript code
            - Result MUST NOT contains ANY MARKDOWN TEXT

            CODE:
            ${content}
            `;
      },
      {}
    );
    commentFromResult = async (result, startPosition) => {
      let comment = contentFromResult(result);
      const file = { filename: "prompt-result.ts", content: comment };
      const { captures } = await parsers.code(file);
      const c = captures[0].node.walk();
      if (c.nodeType !== "program") {
        return [new Error(`file ${file.filename} has no program as firstnode but ${c.nodeType}`)];
      }
      const blockComments = c.currentNode.descendantsOfType("comment");
      if (blockComments.length === 0) {
        return [new Error(`comment generation error on ${file.filename}. No comment detected!`)];
      }
      comment = blockComments[0].text;
      if (startPosition.column > 0) {
        comment = comment.split("\n").map((line, index) => {
          if (index > 0) {
            line = spaces(startPosition.column) + line;
          }
          return line;
        }).join("\n");
      }
      if (!comment.endsWith("\n")) {
        comment += "\n" + spaces(startPosition.column);
      }
      return [void 0, comment];
    };
    processDeclaration = async (type, c, meta) => {
      if (isCommented(c)) {
        return false;
      }
      const codeCommentResult = await _comment({ text: c.currentNode.text, type });
      if (codeCommentResult.error) {
        console.error(`error processing function : ${codeCommentResult.error.message}`);
        return;
      }
      const [error, comment] = await commentFromResult(codeCommentResult, c.currentNode.startPosition);
      if (error) {
        console.error(`error processing ${type} : ${error.message}`);
        return;
      }
      meta.text = insertString(meta.text, comment, 0);
      meta.type = type;
      meta.endIndex += comment.length;
      return true;
    };
    declarationsToEvaluate = [
      { test: isFunctionDecl, processMetaData: async (c, meta) => processDeclaration("function", c, meta) },
      { test: isInterfaceDecl, processMetaData: async (c, meta) => processDeclaration("interface", c, meta) },
      { test: isTypeAliasDecl, processMetaData: async (c, meta) => processDeclaration("type alias", c, meta) },
      { test: isArrowFunctionDecl, processMetaData: async (c, meta) => processDeclaration("arrow function", c, meta) }
    ];
  }
});

// genaisrc/commenter.javascript.mts
var commenter_javascript_exports = {};
__export(commenter_javascript_exports, {
  declarationsToEvaluate: () => declarationsToEvaluate2
});
var isLexicalDecl2, isFunctionDecl2, isArrowFunctionDecl2, isCommented2, _comment2, commentFromResult2, processDeclaration2, declarationsToEvaluate2;
var init_commenter_javascript = __esm({
  "genaisrc/commenter.javascript.mts"() {
    init_commenter_common();
    isLexicalDecl2 = (c) => c.nodeType === "lexical_declaration";
    isFunctionDecl2 = (c) => c.nodeType === "function_declaration";
    isArrowFunctionDecl2 = (c) => {
      if (isLexicalDecl2(c)) {
        const c1 = c.currentNode.walk();
        for (const vd of c1.currentNode.descendantsOfType("variable_declarator")) {
          for (const ad of vd.descendantsOfType("arrow_function")) {
            return true;
          }
        }
      }
      return false;
    };
    isCommented2 = (c) => {
      let result = false;
      if (c.gotoPreviousSibling()) {
        result = c.nodeType === "comment";
        const endIndexOfComment = c.endIndex;
        c.gotoNextSibling();
        result = result && c.startIndex <= endIndexOfComment + 1;
      }
      return result;
    };
    _comment2 = async ({ text: content, type: declarationType }) => await runPrompt(
      (_) => {
        _.$`Comment the first javascript ${declarationType} declaration in provided CODE using JSDoc standard format. 
            Follows the rules below:
            - Result MUST contains exclusively one complete JSDoc comment and nothing else.
            - Result MUST NOT contains any javascript code
            - Result MUST NOT contains ANY MARKDOWN TEXT

            CODE:
            ${content}
            `;
      },
      {}
    );
    commentFromResult2 = async (result, startPosition) => {
      let comment = contentFromResult(result);
      const file = { filename: "prompt-result.js", content: comment };
      const { captures } = await parsers.code(file);
      const c = captures[0].node.walk();
      if (c.nodeType !== "program") {
        return [new Error(`file ${file.filename} has no program as firstnode but ${c.nodeType}`)];
      }
      const blockComments = c.currentNode.descendantsOfType("comment");
      if (blockComments.length === 0) {
        return [new Error(`comment generation error on ${file.filename}. No comment detected!`)];
      }
      comment = blockComments[0].text;
      if (startPosition.column > 0) {
        comment = comment.split("\n").map((line, index) => {
          if (index > 0) {
            line = spaces(startPosition.column) + line;
          }
          return line;
        }).join("\n");
      }
      if (!comment.endsWith("\n")) {
        comment += "\n" + spaces(startPosition.column);
      }
      return [void 0, comment];
    };
    processDeclaration2 = async (type, c, meta) => {
      if (isCommented2(c)) {
        return false;
      }
      const codeCommentResult = await _comment2({ text: c.currentNode.text, type });
      if (codeCommentResult.error) {
        console.error(`error processing function : ${codeCommentResult.error.message}`);
        return;
      }
      const [error, comment] = await commentFromResult2(codeCommentResult, c.currentNode.startPosition);
      if (error) {
        console.error(`error processing ${type} : ${error.message}`);
        return;
      }
      meta.text = insertString(meta.text, comment, 0);
      meta.type = type;
      meta.endIndex += comment.length;
      return true;
    };
    declarationsToEvaluate2 = [
      { test: isFunctionDecl2, processMetaData: async (c, meta) => processDeclaration2("function", c, meta) },
      { test: isArrowFunctionDecl2, processMetaData: async (c, meta) => processDeclaration2("arrow function", c, meta) }
    ];
  }
});

// genaisrc/commenter.java.mts
var commenter_java_exports = {};
__export(commenter_java_exports, {
  declarationsToEvaluate: () => declarationsToEvaluate3
});
var isClassDecl, isInterfaceDecl2, isRecordDecl, isCommented3, _comment3, commentFromResult3, processDescendants, processDeclarationMetadata, declarationsToEvaluate3;
var init_commenter_java = __esm({
  "genaisrc/commenter.java.mts"() {
    init_commenter_common();
    isClassDecl = (c) => c.nodeType === "class_declaration";
    isInterfaceDecl2 = (c) => c.nodeType === "interface_declaration";
    isRecordDecl = (c) => c.nodeType === "record_declaration";
    isCommented3 = (node) => {
      if (node.previousSibling) {
        return node.previousSibling.type === "block_comment" && node.startPosition.row === node.previousSibling.endPosition.row + 1;
      }
      return false;
    };
    _comment3 = async ({ text: content, type: declarationType }) => await runPrompt(
      (_) => {
        _.$`Comment the first java ${declarationType} declaration in provided CODE using JavaDoc standard format. 
                Follow the rules below:
                - Result MUST contains exclusively one complete JavaDoc comment and nothing else.
                - Result MUST NOT contains ANY JAVA CODE
                - Result MUST NOT contains ANY MARKDOWN TEXT
    
                CODE:
                ${content}
                `;
      },
      {
        //model: 'ollama:codellama',
      }
    );
    commentFromResult3 = async (result, startPosition) => {
      let comment = contentFromResult(result);
      const file = { filename: "prompt-result.java", content: comment };
      const { captures } = await parsers.code(file);
      const c = captures[0].node.walk();
      if (c.nodeType !== "program") {
        return [new Error(`file ${file.filename} has no program as firstnode but ${c.nodeType}`)];
      }
      const blockComments = c.currentNode.descendantsOfType("block_comment");
      if (blockComments.length === 0) {
        return [new Error(`comment generation error on ${file.filename}. No comment detected!`)];
      }
      comment = blockComments[0].text;
      if (startPosition.column > 0) {
        comment = comment.split("\n").map((line, index) => {
          if (index > 0) {
            line = spaces(startPosition.column) + line;
          }
          return line;
        }).join("\n");
      }
      if (!comment.endsWith("\n")) {
        comment += "\n" + spaces(startPosition.column);
      }
      return [void 0, comment];
    };
    processDescendants = async (declarations, offset, meta) => {
      for (const decl of declarations) {
        const { node, type } = decl;
        if (isCommented3(node)) {
          continue;
        }
        const codeCommentResult = await _comment3({ text: node.text, type });
        if (codeCommentResult.error) {
          console.error(`error processing ${type} : ${codeCommentResult.error.message}`);
          continue;
        }
        const [error, comment] = await commentFromResult3(codeCommentResult, node.startPosition);
        if (error) {
          console.error(`error processing ${type} : ${error.message}`);
          continue;
        }
        meta.text = insertString(meta.text, comment, node.startIndex - meta.startIndex + offset);
        offset += comment.length;
      }
      return offset;
    };
    processDeclarationMetadata = async (type, c, meta) => {
      let offset = 0;
      if (!isCommented3(c.currentNode)) {
        const codeCommentResult = await _comment3({ text: meta.text, type });
        if (codeCommentResult.error) {
          console.error(`error processing class : ${codeCommentResult.error.message}`);
          return;
        }
        const [error, comment] = await commentFromResult3(codeCommentResult, c.startPosition);
        if (error) {
          console.error(`error processing class : ${error.message}`);
          return;
        }
        meta.text = insertString(meta.text, comment, 0);
        offset = comment.length;
      }
      const parentId = c.nodeId;
      const allDecl = c.currentNode.descendantsOfType([
        "constructor_declaration",
        "method_declaration",
        "interface_declaration",
        "record_declaration",
        "class_declaration"
      ]).filter((node) => node.id !== parentId).map((node) => {
        switch (node.type) {
          case "class_declaration":
            return { node, type: "class" };
          case "constructor_declaration":
            return { node, type: "constructor" };
          case "method_declaration":
            return { node, type: "method" };
          case "interface_declaration":
            return { node, type: "interface" };
          case "record_declaration":
            return { node, type: "record" };
        }
      }).sort((a, b) => a.node.startIndex - b.node.startIndex);
      offset = await processDescendants(allDecl, offset, meta);
      meta.endIndex += offset;
      meta.type = "class";
      return offset > 0;
    };
    declarationsToEvaluate3 = [
      { test: isClassDecl, processMetaData: async (c, meta) => processDeclarationMetadata("class", c, meta) },
      { test: isInterfaceDecl2, processMetaData: async (c, meta) => processDeclarationMetadata("interface", c, meta) },
      { test: isRecordDecl, processMetaData: async (c, meta) => processDeclarationMetadata("record", c, meta) }
    ];
  }
});

// genaisrc/commenter.genai.mts
init_commenter_common();
import assert from "assert";
import fs from "fs/promises";
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
script({
  title: "comment source code",
  description: "Generate comment related to source code",
  model: "ollama:qwen2.5-coder:7b",
  maxTokens: 12e3,
  temperature: 0
});
var hasUncommittedChanges = async (filepath) => {
  let diff = await git.diff({
    staged: false,
    paths: filepath
  });
  if (!diff) {
    diff = await git.diff({
      staged: true,
      paths: filepath
    });
  }
  return diff;
};
var recognizeLanguageByExtension = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const jsRegex = /\.(js|cjs|mjs|jsx)$/;
  const tsRegex = /\.(ts|mts|tsx)$/;
  const javaRegex = /\.(java)$/;
  if (jsRegex.test(ext)) {
    return "javascript";
  } else if (tsRegex.test(ext)) {
    return "typescript";
  } else if (javaRegex.test(ext)) {
    return "java";
  }
};
async function main() {
  const commenters = [
    { lang: await Promise.resolve().then(() => (init_commenter_typescript(), commenter_typescript_exports)), langName: "typescript" },
    { lang: await Promise.resolve().then(() => (init_commenter_javascript(), commenter_javascript_exports)), langName: "javascript" },
    { lang: await Promise.resolve().then(() => (init_commenter_java(), commenter_java_exports)), langName: "java" }
  ];
  for (const file of env.files) {
    if (await hasUncommittedChanges(file.filename)) {
      console.log(`please stage and/or commit file ${file.filename}`);
      continue;
    }
    const langName = recognizeLanguageByExtension(file.filename);
    if (!langName) {
      console.log(`file ${file.filename} has no supported language`);
      continue;
    }
    const { lang } = commenters.find((c2) => c2.langName === langName);
    if (!lang) {
      console.log(`file ${file.filename} has no supported language`);
      continue;
    }
    if (lang.acceptToken) {
      const numtokens = await tokenizers.count(file.content);
      if (!lang.acceptToken(numtokens)) {
        console.warn(`file ${file.filename} has too many tokens, this could result in non expected behavior`);
        if (await host.confirm(`skip commenting file?`)) {
          continue;
        }
      }
    }
    const nodes = Array();
    const { captures } = await parsers.code(file);
    const c = captures[0].node.walk();
    assert(c.nodeType === "program", `file ${file.filename} has no program as firstnode but ${c.nodeType}`);
    const commented = await processCode(lang, c, nodes);
    if (commented) {
      await fs.writeFile(file.filename, nodes.map((c2) => c2.text).join("\n"));
    }
    await sleep(2e3);
  }
}
await main();
