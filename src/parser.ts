import { TokenKind } from "./token_kind";
import { Lexer, getTokenDesc, getTokenKindDesc } from "./lexer";
import { importError, syntaxError, WidlError } from "./error";
import autoBind from "./auto-bind";
import {
  Location,
  Token,
  Name,
  Document,
  OperationDefinition,
  FieldDefinition,
  ObjectField,
  Argument,
  Value,
  BooleanValue,
  EnumValue,
  EnumValueDefinition,
  FloatValue,
  ParameterDefinition,
  IntValue,
  ListValue,
  ObjectValue,
  StringValue,
  Type,
  ListType,
  MapType,
  Annotation,
  Named,
  Node,
  NamespaceDefinition,
  ImportDefinition,
  TypeDefinition,
  InterfaceDefinition,
  RoleDefinition,
  UnionDefinition,
  EnumDefinition,
  DirectiveDefinition,
  Optional,
  Source,
  DirectiveRequire,
  Definition,
  ImportName,
  Kind,
} from "./ast";

type parseFunction = () => Node;
/**
 * Configuration options to control parser behavior
 */
export type ParseOptions = {
  /**
   * By default, the parser creates AST nodes that know the location
   * in the source that they correspond to. This configuration flag
   * disables that behavior for performance or testing.
   */
  noLocation: boolean;

  noSource: boolean;
};

/**
 * Resolver returns the contents of an import.
 */
export type Resolver = (location: string, from: string) => string;

/**
 * Given a WIDL source, parses it into a Document.
 * Throws WidlError if a syntax error is encountered.
 */
export function parse(
  source: string,
  resolver?: Resolver,
  options?: ParseOptions
): Document {
  const parser = new Parser(source, resolver, options);
  return parser.parseDocument();
}

/**
 * Given a string containing a WIDL value (ex. `[42]`), parse the AST for
 * that value.
 * Throws WidlError if a syntax error is encountered.
 *
 * This is useful within tools that operate upon WIDL Values directly and
 * in isolation of complete WIDL documents.
 *
 * Consider providing the results to the utility function: valueFromAST().
 */
export function parseValue(source: string, options?: ParseOptions): Value {
  const parser = new Parser(source, undefined, options);
  parser.expectToken(TokenKind.SOF);
  const value = parser.parseValueLiteral(false);
  parser.expectToken(TokenKind.EOF);
  return value;
}

interface NamedDefinition {
  name: Name;
}

class Parser {
  _resolver: Resolver | undefined;
  _options: ParseOptions;
  _lexer: Lexer;

  constructor(source: string, resolver?: Resolver, options?: ParseOptions) {
    let src = new Source("widl");
    src.setBody(source);
    this._resolver = resolver;
    this._lexer = new Lexer(src);
    this._options = options || {
      noLocation: false,
      noSource: false,
    };
    autoBind(this);
  }

  /**
   * Converts a name lex token into a name parse node.
   */
  parseName(): Name {
    const token = this.expectToken(TokenKind.NAME);
    return new Name(this.loc(token), token.value);
  }

  parseImportName(): ImportName {
    const start = this._lexer.token;
    const name = this.parseName();
    let alias: Name | undefined;
    if (this.expectOptionalKeyword("as")) {
      alias = this.parseName();
    }
    return new ImportName(this.loc(start), name, alias);
  }

  // Implements the parsing rules in the Document section.

  /**
   * Document : Definition+
   */
  parseDocument(): Document {
    const start = this._lexer.token;
    //const def = this.many(TokenKind.SOF, this.parseDefinition, TokenKind.EOF);
    this.expectToken(TokenKind.SOF);
    const defs = [];
    do {
      const def = this.parseDefinition();
      // Handle resolving imports
      if (this._resolver != undefined && def.isKind(Kind.ImportDefinition)) {
        const imp = def as ImportDefinition;
        let importSource = "";
        try {
          importSource = this._resolver!(imp.from.value, "");
        } catch (e) {
          throw importError(imp.from, `could not load ${imp.from.value}: ` + e);
        }
        const importDoc = parse(importSource, this._resolver, this._options);
        if (imp.all) {
          importDoc.definitions.map((def) => defs.push(def));
        } else {
          const allDefs = new Map<string, Definition>();
          importDoc.definitions.map((def) => {
            switch (true) {
              case def.isKind(Kind.TypeDefinition):
                const type = def as TypeDefinition;
                allDefs.set(type.name.value, type);
                break;
              case def.isKind(Kind.EnumDefinition):
                const enumDef = def as EnumDefinition;
                allDefs.set(enumDef.name.value, enumDef);
                break;
              case def.isKind(Kind.UnionDefinition):
                const unionDef = def as UnionDefinition;
                allDefs.set(unionDef.name.value, unionDef);
                break;
              case def.isKind(Kind.DirectiveDefinition):
                const directive = def as DirectiveDefinition;
                allDefs.set(directive.name.value, directive);
                break;
            }
          });

          imp.names.map((n) => {
            const def = allDefs.get(n.name.value);
            if (def == undefined) {
              throw importError(
                n,
                `could not find "${n.name.value}" in "${imp.from.value}"`
              );
            }
            const name = n.alias || n.name;
            switch (true) {
              case def.isKind(Kind.TypeDefinition):
                const type = def as TypeDefinition;
                defs.push(
                  new TypeDefinition(
                    name.loc,
                    name,
                    type.description,
                    type.interfaces,
                    type.annotations,
                    type.fields
                  )
                );
                break;
              case def.isKind(Kind.EnumDefinition):
                const enumDef = def as EnumDefinition;
                defs.push(
                  new EnumDefinition(
                    name.loc,
                    name,
                    enumDef.description,
                    enumDef.annotations,
                    enumDef.values
                  )
                );
                break;
              case def.isKind(Kind.UnionDefinition):
                const unionDef = def as UnionDefinition;
                defs.push(
                  new UnionDefinition(
                    name.loc,
                    name,
                    unionDef.description,
                    unionDef.annotations,
                    unionDef.types
                  )
                );
                break;
              case def.isKind(Kind.DirectiveDefinition):
                const directive = def as DirectiveDefinition;
                defs.push(
                  new DirectiveDefinition(
                    name.loc,
                    name,
                    directive.description,
                    directive.parameters,
                    directive.locations,
                    directive.requires
                  )
                );
                break;
            }
          });
        }
      } else {
        defs.push(def);
      }
    } while (!this.expectOptionalToken(TokenKind.EOF));
    return new Document(this.loc(start), defs);
  }

  /**
   * Definition :
   *   - ExecutableDefinition
   *   - TypeSystemDefinition
   *   - TypeSystemExtension
   *
   * ExecutableDefinition :
   *   - OperationDefinition
   *   - FragmentDefinition
   */
  parseDefinition(): Definition {
    if (this.peek(TokenKind.NAME)) {
      switch (this._lexer.token.value) {
        case "namespace":
          return this.parseNamespaceDefinition();
        case "import":
          return this.parseImportDefinition();
        case "directive":
          return this.parseDirectiveDefinition();
        case "interface":
          return this.parseInterfaceDefinition();
        case "role":
          return this.parseRoleTypeDefinition();
        case "type":
        case "union":
        case "enum":
          return this.parseTypeSystemDefinition();
      }
    } else if (this.peek(TokenKind.BRACE_L)) {
      return this.parseOperationDefinition();
    } else if (this.peekDescription()) {
      return this.parseTypeSystemDefinition();
    }

    throw this.unexpected();
  }

  // Implements the parsing rules in the Operations section.

  /**
   * OperationDefinition :
   *  - SelectionSet
   *  - OperationType Name? VariableDefinitions? Directives? SelectionSet
   */
  parseOperationDefinition(): OperationDefinition {
    const start = this._lexer.token;
    const description = this.parseDescription();
    const name = this.parseName();
    const [parameters, isUnary] = this.parseParameterDefinitions(true);
    this.expectToken(TokenKind.COLON);
    const type = this.parseType();
    const annotations = this.parseAnnotations();

    return new OperationDefinition(
      this.loc(start),
      name,
      description,
      parameters,
      type,
      annotations,
      isUnary
    );
  }

  /**
   * Type :
   *   - NamedType
   *   - ListType
   *   - NonNullType
   */
  parseType(): Type {
    const start = this._lexer.token;
    var keyType: Type | undefined;
    var valueType: Type | undefined;
    var ttype: Type | undefined;
    // [ String? ]?
    switch (start.kind) {
      case TokenKind.BRACKET_L:
        this._lexer.advance();
        ttype = this.parseType();
      case TokenKind.BRACKET_R:
        this._lexer.advance();
        ttype = new ListType(this.loc(start), ttype!);
        break;
      case TokenKind.BRACE_L:
        this._lexer.advance();
        keyType = this.parseType();
        this.expectToken(TokenKind.COLON);
        valueType = this.parseType();
      case TokenKind.BRACE_R:
        this._lexer.advance();
        ttype = new MapType(this.loc(start), keyType!, valueType!);
        break;
      case TokenKind.NAME:
        ttype = this.parseNamed();
        break;
    }

    // QUESTION must be executed
    const skp = this.expectOptionalToken(TokenKind.QUESTION);
    if (skp) {
      ttype = new Optional(this.loc(skp), ttype!);
    }
    return ttype!;
  }

  /**
   * Arguments[Const] : ( Argument[?Const]+ )
   */
  parseArguments(): Array<Argument> {
    const item = this.parseArgument;
    return this.optionalMany(TokenKind.PAREN_L, item, TokenKind.PAREN_R);
  }

  /**
   * Argument[Const] : Name : Value[?Const]
   */
  parseArgument(): Argument {
    const start = this._lexer.token;

    var name: Name;
    if (!this.peek(TokenKind.NAME)) {
      name = new Name(undefined, "value");
    } else {
      name = this.parseName();
      this.expectToken(TokenKind.COLON);
    }

    return new Argument(this.loc(start), name, this.parseValueLiteral(false));
  }

  // Implements the parsing rules in the Values section.

  /**
   * Value[Const] :
   *   - [~Const] Variable
   *   - IntValue
   *   - FloatValue
   *   - StringValue
   *   - BooleanValue
   *   - NullValue
   *   - EnumValue
   *   - ListValue[?Const]
   *   - ObjectValue[?Const]
   *
   * BooleanValue : one of `true` `false`
   *
   * NullValue : `null`
   *
   * EnumValue : Name but not `true`, `false` or `null`
   */
  parseValueLiteral(isConst: boolean): Value {
    const token = this._lexer.token;
    switch (token.kind) {
      case TokenKind.BRACKET_L:
        return this.parseList(isConst);
      case TokenKind.BRACE_L:
        return this.parseObject(isConst);
      case TokenKind.INT:
        this._lexer.advance();
        return new IntValue(this.loc(token), parseInt(token.value));
      case TokenKind.FLOAT:
        this._lexer.advance();
        return new FloatValue(this.loc(token), parseFloat(token.value));
      case TokenKind.STRING:
      case TokenKind.BLOCK_STRING:
        return this.parseStringLiteral();
      case TokenKind.NAME:
        this._lexer.advance();
        switch (token.value) {
          case "true":
            return new BooleanValue(this.loc(token), true);
          case "false":
            return new BooleanValue(this.loc(token), false);
          case "null":
          // TODO
          default:
            return new EnumValue(this.loc(token), token.value);
        }
    }
    throw this.unexpected();
  }

  parseConstValue(): Value {
    return this.parseValueLiteral(true);
  }

  parseValueValue(): Value {
    return this.parseValueLiteral(false);
  }

  parseStringLiteral(): StringValue {
    const token = this._lexer.token;
    this._lexer.advance();
    return new StringValue(this.loc(token), token.value);
  }

  /**
   * ListValue[Const] :
   *   - [ ]
   *   - [ Value[?Const]+ ]
   */
  parseList(isConst: boolean): ListValue {
    const start = this._lexer.token;
    const item = () => this.parseValueLiteral(isConst);
    return new ListValue(
      this.loc(start),
      this.any(TokenKind.BRACKET_L, item, TokenKind.BRACKET_R)
    );
  }

  /**
   * ObjectValue[Const] :
   *   - { }
   *   - { ObjectField[?Const]+ }
   */
  parseObject(isConst: boolean): ObjectValue {
    const start = this._lexer.token;
    const item = () => this.parseObjectField(isConst);
    return new ObjectValue(
      this.loc(start),
      this.any(TokenKind.BRACE_L, item, TokenKind.BRACE_R)
    );
  }

  /**
   * ObjectField[Const] : Name : Value[?Const]
   */
  parseObjectField(isConst: boolean): ObjectField {
    const start = this._lexer.token;
    if (
      start.kind == TokenKind.NS ||
      start.kind == TokenKind.NAME ||
      start.kind == TokenKind.STRING
    ) {
      this._lexer.advance();
    } else {
      throw this.unexpected();
    }

    const name = new Name(this.loc(start), start.value);
    this.expectToken(TokenKind.COLON);
    return new ObjectField(
      this.loc(start),
      name,
      this.parseValueLiteral(isConst)
    );
  }

  parseAnnotations(): Array<Annotation> {
    let directives = Array<Annotation>();
    while (this.peek(TokenKind.AT)) {
      this._lexer.advance();
      directives.push(this.parseAnnotation());
    }
    return directives;
  }

  parseAnnotation(): Annotation {
    const start = this._lexer.token;
    const name = this.parseName();
    const args = this.parseArguments();
    return new Annotation(this.loc(start), name, args);
  }

  // Implements the parsing rules in the Types section.

  /**
   * NamedType : Name
   */
  parseNamed(): Named {
    const start = this._lexer.token;
    return new Named(this.loc(start), this.parseName());
  }

  // Implements the parsing rules in the Type Definition section.

  /**
   * TypeSystemDefinition :
   *   - SchemaDefinition
   *   - TypeDefinition
   *   - DirectiveDefinition
   *
   * TypeDefinition :
   *   - ScalarTypeDefinition
   *   - ObjectTypeDefinition
   *   - InterfaceTypeDefinition
   *   - RoleTypeDefinition
   *   - UnionTypeDefinition
   *   - EnumTypeDefinition
   *   - InputObjectTypeDefinition
   */
  parseTypeSystemDefinition(): Node {
    // Many definitions begin with a description and require a lookahead.
    const keywordToken = this.peekDescription()
      ? this._lexer.lookahead()
      : this._lexer.token;

    if (keywordToken.kind === TokenKind.NAME) {
      switch (keywordToken.value) {
        case String.fromCharCode(TokenKind.STRING):
          return this.parseTypeSystemDefinition();
        case String.fromCharCode(TokenKind.BLOCK_STRING):
          return this.parseTypeSystemDefinition();
        case String.fromCharCode(TokenKind.NAME):
          return this.parseTypeSystemDefinition();
        case "type":
          return this.parseTypeDefinition();
        case "union":
          return this.parseUnionDefinition();
        case "enum":
          return this.parseEnumDefinition();
      }
    }

    throw this.unexpected(keywordToken);
  }

  parseNamespaceDefinition(): Node {
    let start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("namespace");

    start = this._lexer.token;
    if (
      start.kind == TokenKind.NS ||
      start.kind == TokenKind.NAME ||
      start.kind == TokenKind.STRING
    ) {
      this._lexer.advance();
    } else {
      throw this.unexpected();
    }

    const name = new Name(this.loc(start), start.value);
    const annotations = this.parseAnnotations();
    return new NamespaceDefinition(
      this.loc(start),
      description,
      name,
      annotations
    );
  }

  parseImportDefinition(): Node {
    let start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("import");
    let all = false;
    let names: ImportName[] = [];

    if (this.peek(TokenKind.STAR)) {
      this._lexer.advance();
      all = true;
    } else if (this.peek(TokenKind.BRACE_L)) {
      names = this.many(
        TokenKind.BRACE_L,
        this.parseImportName,
        TokenKind.BRACE_R
      );
    } else {
      throw this.unexpected();
    }

    this.expectKeyword("from");

    start = this._lexer.token;
    if (
      start.kind == TokenKind.NS ||
      start.kind == TokenKind.NAME ||
      start.kind == TokenKind.STRING
    ) {
      this._lexer.advance();
    } else {
      throw this.unexpected();
    }

    const from = new Name(this.loc(start), start.value);
    const annotations = this.parseAnnotations();
    return new ImportDefinition(
      this.loc(start),
      description,
      all,
      names,
      from,
      annotations
    );
  }

  peekDescription(): boolean {
    return this.peek(TokenKind.STRING) || this.peek(TokenKind.BLOCK_STRING);
  }

  /**
   * Description : StringValue
   */
  parseDescription(): StringValue | undefined {
    if (this.peekDescription()) {
      return this.parseStringLiteral();
    }
    return undefined;
  }

  /**
   * TypeDefinition :
   *   Description?
   *   type Name ImplementsInterfaces? Annotations[Const]? FieldsDefinition?
   */
  parseTypeDefinition(): Node {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("type");
    const name = this.parseName();
    const interfaces = this.parseImplementsInterfaces();
    const annotations = this.parseAnnotations();
    const iFields = this.reverse(
      TokenKind.BRACE_L,
      this.parseFieldDefinition,
      TokenKind.BRACE_R,
      false
    );
    return new TypeDefinition(
      this.loc(start),
      name,
      description,
      interfaces,
      annotations,
      iFields as Array<FieldDefinition>
    );
  }

  /**
   * ImplementsInterfaces :
   *   - implements `&`? NamedType
   *   - ImplementsInterfaces & NamedType
   */
  parseImplementsInterfaces(): Array<Named> {
    const types = [];
    if (this.expectOptionalKeyword("implements")) {
      // Optional leading ampersand
      this.expectOptionalToken(TokenKind.AMP);
      do {
        types.push(this.parseNamed());
      } while (this.expectOptionalToken(TokenKind.AMP));
    }
    return types;
  }

  /**
   * FieldDefinition :
   *   - Description? Name ArgumentsDefinition? : Type Annotations[Const]?
   */
  parseFieldDefinition(): FieldDefinition {
    const start = this._lexer.token;
    const description = this.parseDescription();
    const name = this.parseName();
    this.expectToken(TokenKind.COLON);
    const type = this.parseType();
    let defVal: Value | undefined;
    if (this.expectOptionalToken(TokenKind.EQUALS)) {
      defVal = this.parseValueLiteral(true);
    }
    const annotations = this.parseAnnotations();

    return new FieldDefinition(
      this.loc(start),
      name,
      description,
      type,
      defVal,
      annotations
    );
  }

  /**
   * ParameterDefinition : ( InputValueDefinition+ )
   */
  parseParameterDefinitions(
    unary: boolean
  ): [Array<ParameterDefinition>, boolean] {
    if (this.peek(TokenKind.PAREN_L)) {
      // arguments operation
      const inputValDefs = this.reverse(
        TokenKind.PAREN_L,
        this.parseParameterDefinition,
        TokenKind.PAREN_R,
        true
      );
      return [inputValDefs as Array<ParameterDefinition>, false];
    } else if (unary && this.peek(TokenKind.BRACE_L)) {
      // unary
      this._lexer.advance();
      const inputValueDef = this.parseParameterDefinition();
      this.expectToken(TokenKind.BRACE_R);
      const arr = new Array<ParameterDefinition>();
      arr.push(inputValueDef);
      return [arr, true];
    }
    this._lexer.advance();
    throw new Error(
      "for Argument Definitions, expect a ( or [ got " + this._lexer.token
    );
  }

  /**
   * ParameterDefinition :
   *   - Description? Name : Type DefaultValue? Annotations[Const]?
   */
  parseParameterDefinition(): ParameterDefinition {
    const start = this._lexer.token;
    const description = this.parseDescription();
    const name = this.parseName();
    this.expectToken(TokenKind.COLON);
    const type = this.parseType();
    let defaultValue: Value | undefined;
    if (this.expectOptionalToken(TokenKind.EQUALS)) {
      defaultValue = this.parseConstValue();
    }
    const annotations = this.parseAnnotations();
    return new ParameterDefinition(
      this.loc(start),
      name,
      description,
      type,
      defaultValue,
      annotations
    );
  }

  reverse(
    openKind: number,
    parseFn: parseFunction,
    closeKind: number,
    zinteger: boolean
  ): Array<Node> {
    this.expectToken(openKind);
    var nodeArr = [];
    while (true) {
      if (this.expectOptionalToken(closeKind)) {
        break;
      } else {
        nodeArr.push(parseFn());
      }
    }
    // if (zinteger && NodeList.length == 0) {
    //   null; // TODO
    // }
    return nodeArr;
  }

  /**
   * InterfaceTypeDefinition :
   *   - Description? interface Name Annotations[Const]? FieldsDefinition?
   */
  parseInterfaceDefinition(): Node {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("interface"); // TODO
    const annotations = this.parseAnnotations();
    const iOperations = this.reverse(
      TokenKind.BRACE_L,
      this.parseOperationDefinition,
      TokenKind.BRACE_R,
      false
    );
    return new InterfaceDefinition(
      this.loc(start),
      description,
      iOperations as OperationDefinition[],
      annotations
    );
  }

  /**
   * InterfaceTypeDefinition :
   *   - Description? interface Name Annotations[Const]? FieldsDefinition?
   */
  parseRoleTypeDefinition(): Node {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("role");
    const name = this.parseName();
    const annotations = this.parseAnnotations();
    const iOperations = this.reverse(
      TokenKind.BRACE_L,
      this.parseOperationDefinition,
      TokenKind.BRACE_R,
      false
    );
    return new RoleDefinition(
      this.loc(start),
      name,
      description,
      iOperations as OperationDefinition[],
      annotations
    );
  }

  /**
   * UnionTypeDefinition :
   *   - Description? union Name Annotations[Const]? UnionMemberTypes?
   */
  parseUnionDefinition(): Node {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("union");
    const name = this.parseName();
    const annotations = this.parseAnnotations();
    this.expectToken(TokenKind.EQUALS);
    const types = this.parseUnionMembers();
    return new UnionDefinition(
      this.loc(start),
      name,
      description,
      annotations,
      types
    );
  }

  /**
   * UnionMembers :
   *   - NamedType
   *   - UnionMemberTypes | NamedType
   */
  parseUnionMembers(): Array<Named> {
    const types = [];
    do {
      const member = this.parseNamed();
      types.push(member);
    } while (this.expectOptionalToken(TokenKind.PIPE));
    return types;
  }

  /**
   * EnumDefinition :
   *   - Description? enum Name Annotations[Const]? EnumValuesDefinition?
   */
  parseEnumDefinition(): Node {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("enum");
    const name = this.parseName();
    const annotations = this.parseAnnotations();
    const iEnumValueDefs = this.reverse(
      TokenKind.BRACE_L,
      this.parseEnumValueDefinition,
      TokenKind.BRACE_R,
      false
    ) as Array<EnumValueDefinition>;

    return new EnumDefinition(
      this.loc(start),
      name,
      description,
      annotations,
      iEnumValueDefs
    );
  }

  /**
   * EnumValueDefinition : Description? EnumValue Annotations[Const]?
   *
   * EnumValue : Name
   */
  parseEnumValueDefinition(): EnumValueDefinition {
    const start = this._lexer.token;
    const description = this.parseDescription();
    const name = this.parseName();
    this.expectToken(TokenKind.EQUALS);

    const token = this.expectToken(TokenKind.INT);
    const index = new IntValue(this.loc(token), parseInt(token.value));
    let display: StringValue | undefined;
    if (this.peek(TokenKind.STRING)) {
      display = this.parseStringLiteral();
    }

    const annotations = this.parseAnnotations();
    return new EnumValueDefinition(
      this.loc(start),
      name,
      description,
      index,
      display,
      annotations
    );
  }

  parseDirectiveDefinition(): DirectiveDefinition {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("directive");
    this.expectToken(TokenKind.AT);
    const name = this.parseName();
    const [args, _] = this.parseParameterDefinitions(false);
    this.expectKeyword("on");
    const locs = this.parseDirectiveLocations();
    const reqs: DirectiveRequire[] = [];

    if (this.expectOptionalKeyword("require")) {
      do {
        const req = this.parseDirectiveRequire();
        reqs.push(req);
      } while (this.peek(TokenKind.AT));
    }

    return new DirectiveDefinition(
      this.loc(start),
      name,
      description,
      args,
      locs,
      reqs
    );
  }

  parseDirectiveRequire(): DirectiveRequire {
    const start = this._lexer.token;
    this.expectToken(TokenKind.AT);
    const name = this.parseName();
    this.expectKeyword("on");
    const locations = this.parseDirectiveLocations();
    return new DirectiveRequire(this.loc(start), name, locations);
  }

  /**
   * DirectiveLocations :
   *   - `|`? DirectiveLocation
   *   - DirectiveLocations | DirectiveLocation
   */
  parseDirectiveLocations(): Array<Name> {
    // Optional leading pipe
    this.expectOptionalToken(TokenKind.PIPE);
    const locations = [];
    do {
      locations.push(this.parseDirectiveLocation());
    } while (this.expectOptionalToken(TokenKind.PIPE));
    return locations as Array<Name>;
  }

  /*
   * DirectiveLocation :
   *   - ExecutableDirectiveLocation
   *   - TypeSystemDirectiveLocation
   *
   * ExecutableDirectiveLocation : one of
   *   `QUERY`
   *   `MUTATION`
   *   `SUBSCRIPTION`
   *   `FIELD`
   *   `FRAGMENT_DEFINITION`
   *   `FRAGMENT_SPREAD`
   *   `INLINE_FRAGMENT`
   *
   * TypeSystemDirectiveLocation : one of
   *   `SCHEMA`
   *   `SCALAR`
   *   `OBJECT`
   *   `FIELD_DEFINITION`
   *   `ARGUMENT_DEFINITION`
   *   `INTERFACE`
   *   `UNION`
   *   `ENUM`
   *   `ENUM_VALUE`
   *   `INPUT_OBJECT`
   *   `INPUT_FIELD_DEFINITION`
   */
  parseDirectiveLocation(): Name {
    const start = this._lexer.token;
    const name = this.parseName();
    return name;
    throw this.unexpected(start);
  }

  // Core parsing utility functions

  /**
   * Returns a location object, used to identify the place in
   * the source that created a given parsed object.
   */
  loc(startToken: Token | undefined): Location | undefined {
    if (startToken == undefined) {
      return undefined;
    }
    if (this._options?.noLocation !== true) {
      return new Location(startToken.start, startToken.end, this._lexer.source);
    }
    return undefined;
  }

  /**
   * Determines if the next token is of a given kind
   */
  peek(kind: number): boolean {
    return this._lexer.token.kind === kind;
  }

  /**
   * If the next token is of the given kind, return that token after advancing
   * the lexer. Otherwise, do not change the parser state and throw an error.
   */
  expectToken(kind: number): Token {
    const token = this._lexer.token;
    if (token.kind === kind) {
      this._lexer.advance();
      return token;
    }

    throw syntaxError(
      this._lexer.source,
      token.start,
      `Expected ${getTokenKindDesc(kind)}, found ${getTokenDesc(token)}.`
    );
  }

  /**
   * If the next token is of the given kind, return that token after advancing
   * the lexer. Otherwise, do not change the parser state and return undefined.
   */
  expectOptionalToken(kind: number): Token | undefined {
    const token = this._lexer.token;
    if (token.kind === kind) {
      this._lexer.advance();
      return token;
    }
    return undefined;
  }

  /**
   * If the next token is a given keyword, advance the lexer.
   * Otherwise, do not change the parser state and throw an error.
   */
  expectKeyword(value: string) {
    const token = this._lexer.token;
    if (token.kind === TokenKind.NAME && token.value === value) {
      this._lexer.advance();
    } else {
      throw syntaxError(
        this._lexer.source,
        token.start,
        `Expected "${value}", found ${getTokenDesc(token)}.`
      );
    }
  }

  /**
   * If the next token is a given keyword, return "true" after advancing
   * the lexer. Otherwise, do not change the parser state and return "false".
   */
  expectOptionalKeyword(value: string): boolean {
    const token = this._lexer.token;
    if (token.kind === TokenKind.NAME && token.value === value) {
      this._lexer.advance();
      return true;
    }
    return false;
  }

  /**
   * Helper function for creating an error when an unexpected lexed token
   * is encountered.
   */
  unexpected(atToken?: Token): WidlError {
    const token = atToken ?? this._lexer.token;
    return syntaxError(
      this._lexer.source,
      token.start,
      `Unexpected ${getTokenDesc(token)}.`
    );
  }

  /**
   * Returns a possibly empty list of parse nodes, determined by
   * the parseFn. This list begins with a lex token of openKind
   * and ends with a lex token of closeKind. Advances the parser
   * to the next lex token after the closing token.
   */
  any<T>(openKind: number, parseFn: () => T, closeKind: number): Array<T> {
    this.expectToken(openKind);
    const nodes = [];
    while (!this.expectOptionalToken(closeKind)) {
      nodes.push(parseFn.call(this));
    }
    return nodes;
  }

  /**
   * Returns a list of parse nodes, determined by the parseFn.
   * It can be empty only if open token is missing otherwise it will always
   * return non-empty list that begins with a lex token of openKind and ends
   * with a lex token of closeKind. Advances the parser to the next lex token
   * after the closing token.
   */
  optionalMany<T>(
    openKind: number,
    parseFn: () => T,
    closeKind: number
  ): Array<T> {
    if (this.expectOptionalToken(openKind)) {
      const nodes = [];
      do {
        nodes.push(parseFn.call(this));
      } while (!this.expectOptionalToken(closeKind));
      return nodes;
    }
    return [];
  }

  /**
   * Returns a non-empty list of parse nodes, determined by
   * the parseFn. This list begins with a lex token of openKind
   * and ends with a lex token of closeKind. Advances the parser
   * to the next lex token after the closing token.
   */
  many<T>(openKind: number, parseFn: () => T, closeKind: number): Array<T> {
    this.expectToken(openKind);
    const nodes = [];
    do {
      nodes.push(parseFn.call(this));
    } while (!this.expectOptionalToken(closeKind));
    return nodes;
  }
}
