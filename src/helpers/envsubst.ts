type Env = Record<string, string>;

type Replacer = (
  input: string,
  escapes: string,
  start: string,
  key: string,
  def: string,
  end: string
) => string;

export function replace(str: string, env: Env | Env[]) {
  return str.replace(
    /(\\*)\$({)?([a-z0-9_]+)(:-[^}]+)?(})?/gi,
    replacer(env || {})
  );
}

function replacer(env: Env | Env[]): Replacer {
  return Array.isArray(env) ? replaceArray(env) : replaceEnv(env);
}

function isEscaped(escapes: string) {
  return escapes.length % 2 === 1;
}

function replaceArray(env: Env[]) {
  const defaultValue = defaultValueFactory(env);

  return (
    input: string,
    escapes: string,
    start: string,
    key: string,
    def: string,
    end: string
  ) => {
    if (isEscaped(escapes)) {
      // Only cut off 1 backslash so the shell that the output will probably be sent to can resolve the remaining ones
      // (this way users don't have to triple-escape their stuff)
      return input.slice(1);
    }

    for (const element of env) {
      if (element[key]) return element[key];
    }
    return escapes + defaultValue(start, def, end);
  };
}

function replaceEnv(env: Env) {
  const defaultValue = defaultValueFactory(env);
  return (
    input: string,
    escapes: string,
    start: string,
    key: string,
    def: string,
    end: string
  ) => {
    if (isEscaped(escapes)) {
      return input.slice(1);
    }
    return escapes + (env[key] || defaultValue(start, def, end));
  };
}

function defaultValueFactory(env: Env | Env[]) {
  return (start: string, def: string, end: string) => {
    return start && def && end ? replace(def.slice(2), env) : '';
  };
}
