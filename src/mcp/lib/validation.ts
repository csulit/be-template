const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function validateIdentifier(name: string, label: string): string {
  if (!IDENTIFIER_REGEX.test(name)) {
    throw new Error(
      `Invalid ${label}: "${name}". Only letters, numbers, and underscores are allowed, and it must start with a letter or underscore.`
    );
  }
  return `"${name}"`;
}

export function validateTableName(name: string): string {
  return validateIdentifier(name, "table name");
}

export function validateColumnName(name: string): string {
  return validateIdentifier(name, "column name");
}

export function validateSchemaName(name: string): string {
  return validateIdentifier(name, "schema name");
}
