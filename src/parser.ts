import { TokenKind } from "./token_kind";
import { Lexer, getTokenDesc, getTokenKindDesc } from "./lexer";
import { syntaxError, WidlError } from "./error";
import autoBind from "./auto-bind";
import {
  Location,
  Token,
  Name,
  Document,
  Definition,
  OperationDefinition,
  FieldDefinition,
  ObjectField,
  Argument,
  Value,
  BooleanValue,
  EnumValue,
  EnumValueDefinition,
  FloatValue,
  InputValueDefinition,
  IntValue,
  ListValue,
  MapValue,
  ObjectValue,
  StringValue,
  NamespaceDefinition,
  Type,
  List,
  Annotation,
  Named,
  Node,
  ObjectDefinition,
  InterfaceDefinition,
  RoleDefinition,
  UnionDefinition,
  EnumDefinition,
  AnnotationDefinition,
  Map,
  Optional,
  Source,
} from "./ast/index";

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
 * Given a WIDL source, parses it into a Document.
 * Throws WidlError if a syntax error is encountered.
 */
export function parse(source: string, options?: ParseOptions): Document {
  const parser = new Parser(source, options);
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
  const parser = new Parser(source, options);
  parser.expectToken(TokenKind.SOF);
  const value = parser.parseValueLiteral(false);
  parser.expectToken(TokenKind.EOF);
  return value;
}

class Parser {
  _options: ParseOptions;
  _lexer: Lexer;

  constructor(source: string, options?: ParseOptions) {
    let src = new Source("widl");
    src.setBody(source);
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
    return new Name(this.loc(token), (token.value as any) as string);
  }

  // Implements the parsing rules in the Document section.

  /**
   * Document : Definition+
   */
  parseDocument(): Document {
    const start = this._lexer.token;
    const def = this.many(TokenKind.SOF, this.parseDefinition, TokenKind.EOF);
    return new Document(this.loc(start), def);
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
        case "interface":
          return this.parseInterfaceTypeDefinition();
        case "role":
          return this.parseRoleTypeDefinition();
        case "scalar":
        case "type":
        case "union":
        case "enum":
          return this.parseTypeSystemDefinition();
        case "namespace":
          return this.parseNamespaceDefinition();
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
    const [definitions, isUnary] = this.parseArgumentDefs(true);
    this.expectToken(TokenKind.COLON);
    const type = this.parseType();
    const directives = this.parseAnnotations();

    return new OperationDefinition(
      this.loc(start),
      name,
      description,
      definitions,
      type,
      directives,
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
    // [ String! ]!
    switch (start.kind) {
      case TokenKind.BRACKET_L:
        this._lexer.advance();
        ttype = this.parseType();
      case TokenKind.BRACKET_R:
        this._lexer.advance();
        ttype = new List(this.loc(start), ttype!);
        break;
      case TokenKind.BRACE_L:
        this._lexer.advance();
        keyType = this.parseType();
        this.expectToken(TokenKind.COLON);
        valueType = this.parseType();
      case TokenKind.BRACE_R:
        this._lexer.advance();
        ttype = new Map(this.loc(start), keyType!, valueType!);
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
    const name = this.parseName();

    this.expectToken(TokenKind.COLON);
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
        return new IntValue(this.loc(token), (token.value as any) as string);
      case TokenKind.FLOAT:
        this._lexer.advance();
        return new FloatValue(this.loc(token), (token.value as any) as string);
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
            return new EnumValue(
              this.loc(token),
              (token.value as any) as string
            );
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
    return new StringValue(this.loc(token), token.value as string); // TODO
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

  parseMap(isConst: boolean): MapValue {
    const start = this._lexer.token;
    const item = () => this.parseValueLiteral(isConst);
    return new MapValue(
      this.loc(start),
      this.any(TokenKind.BRACE_L, item, TokenKind.BRACE_R)
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
    const name = this.parseName();
    this.expectToken(TokenKind.COLON);
    return new ObjectField(
      this.loc(start),
      this.parseValueLiteral(isConst),
      name
    );
  }

  parseAnnotations(): Array<Annotation> {
    let directives = Array<Annotation>();
    while (this.peek(TokenKind.AT)) {
      this._lexer.advance(); // TODO cleanup
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
          return this.parseObjectTypeDefinition();
        case "interface":
          return this.parseInterfaceTypeDefinition();
        case "role":
          return this.parseRoleTypeDefinition();
        case "union":
          return this.parseUnionTypeDefinition();
        case "enum":
          return this.parseEnumTypeDefinition();
        case "namespace":
          return this.parseNamespaceDefinition();
        case "directive":
          return this.parseAnnotationDefinition();
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

    const name = new Name(this.loc(start), (start.value as any) as string);
    const directives = this.parseAnnotations();
    return new NamespaceDefinition(
      this.loc(start),
      description,
      name,
      directives
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
   * ObjectTypeDefinition :
   *   Description?
   *   type Name ImplementsInterfaces? Directives[Const]? FieldsDefinition?
   */
  parseObjectTypeDefinition(): Node {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("type");
    const name = this.parseName();
    const interfaces = this.parseImplementsInterfaces();
    const directives = this.parseAnnotations();
    const iFields = this.reverse(
      TokenKind.BRACE_L,
      this.parseFieldDefinition,
      TokenKind.BRACE_R,
      false
    );
    return new ObjectDefinition(
      this.loc(start),
      name,
      description,
      interfaces,
      directives,
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
   *   - Description? Name ArgumentsDefinition? : Type Directives[Const]?
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
    const directives = this.parseAnnotations();

    return new FieldDefinition(
      this.loc(start),
      name,
      description,
      type,
      defVal,
      directives
    );
  }

  /**
   * ArgumentsDefinition : ( InputValueDefinition+ )
   */
  parseArgumentDefs(unary: boolean): [Array<InputValueDefinition>, boolean] {
    if (this.peek(TokenKind.PAREN_L)) {
      // arguments operation
      const inputValDefs = this.reverse(
        TokenKind.PAREN_L,
        this.parseInputValueDef,
        TokenKind.PAREN_R,
        true
      );
      return [inputValDefs as Array<InputValueDefinition>, false];
    } else if (unary && this.peek(TokenKind.BRACE_L)) {
      // unary
      this._lexer.advance();
      const inputValueDef = this.parseInputValueDef();
      this.expectToken(TokenKind.BRACE_R);
      const arr = new Array<InputValueDefinition>();
      arr.push(inputValueDef);
      return [arr, true];
    }
    this._lexer.advance();
    throw new Error(
      "for Argument Definitions, expect a ( or [ got " + this._lexer.token
    );
  }

  /**
   * InputValueDefinition :
   *   - Description? Name : Type DefaultValue? Directives[Const]?
   */
  parseInputValueDef(): InputValueDefinition {
    const start = this._lexer.token;
    const description = this.parseDescription();
    const name = this.parseName();
    this.expectToken(TokenKind.COLON);
    const type = this.parseType();
    let defaultValue: Value | undefined;
    if (this.expectOptionalToken(TokenKind.EQUALS)) {
      defaultValue = this.parseConstValue();
    }
    const directives = this.parseAnnotations();
    return new InputValueDefinition(
      this.loc(start),
      name,
      description,
      type,
      defaultValue,
      directives
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
   *   - Description? interface Name Directives[Const]? FieldsDefinition?
   */
  parseInterfaceTypeDefinition(): Node {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("interface"); // TODO
    const directives = this.parseAnnotations();
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
      directives
    );
  }

  /**
   * InterfaceTypeDefinition :
   *   - Description? interface Name Directives[Const]? FieldsDefinition?
   */
  parseRoleTypeDefinition(): Node {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("role");
    const name = this.parseName();
    const directives = this.parseAnnotations();
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
      directives
    );
  }

  /**
   * UnionTypeDefinition :
   *   - Description? union Name Directives[Const]? UnionMemberTypes?
   */
  parseUnionTypeDefinition(): Node {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("union");
    const name = this.parseName();
    const directives = this.parseAnnotations();
    this.expectToken(TokenKind.EQUALS);
    const types = this.parseUnionMembers();
    return new UnionDefinition(
      this.loc(start),
      name,
      description,
      directives,
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
   * EnumTypeDefinition :
   *   - Description? enum Name Directives[Const]? EnumValuesDefinition?
   */
  parseEnumTypeDefinition(): Node {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("enum");
    const name = this.parseName();
    const directives = this.parseAnnotations();
    const iEnumValueDefs = this.reverse(
      TokenKind.BRACE_L,
      this.parseEnumValueDefinition,
      TokenKind.BRACE_R,
      false
    ) as Array<EnumDefinition>;

    return new EnumDefinition(
      this.loc(start),
      name,
      description,
      directives,
      iEnumValueDefs
    );
  }

  /**
   * EnumValueDefinition : Description? EnumValue Directives[Const]?
   *
   * EnumValue : Name
   */
  parseEnumValueDefinition(): EnumValueDefinition {
    const start = this._lexer.token;
    const description = this.parseDescription();
    const name = this.parseName();
    const directives = this.parseAnnotations();
    return new EnumValueDefinition(
      this.loc(start),
      name,
      description,
      directives
    );
  }

  parseAnnotationDefinition(): AnnotationDefinition {
    const start = this._lexer.token;
    const description = this.parseDescription();
    this.expectKeyword("directive"); // TODO
    this.expectToken(TokenKind.AT);
    const name = this.parseName();
    const [args, _] = this.parseArgumentDefs(false);
    this.expectKeyword("on");
    const locs = this.parseAnnotationLocations();

    return new AnnotationDefinition(
      this.loc(start),
      name,
      description,
      args,
      locs
    );
  }

  /**
   * AnnotationLocations :
   *   - Name
   *   - AnnotationLocations | Name
   */
  parseAnnotationLocations(): Array<Name> {
    var locations = [];
    do {
      let name = this.parseName();
      locations.push(name);
    } while (this.expectOptionalToken(TokenKind.PIPE));
    return locations as Array<Name>;
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
    return locations;
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
