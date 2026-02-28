import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const APP_DIR = path.join(process.cwd(), "src", "app");
const SRC_DIR = path.join(process.cwd(), "src");
const EXCLUDED_SEGMENTS = new Set(["admin", "api", "preview", "test"]);
const DYNAMIC_PATTERNS = [
  /export\s+const\s+dynamic\s*=\s*"force-dynamic"/,
  /export\s+const\s+dynamic\s*=\s*'force-dynamic'/,
];
const FORBIDDEN_PUBLIC_IMPORT_PATTERNS = [
  /from\s+['"]@\/lib\/db['"]/,
  /from\s+['"]@\/lib\/auth['"]/,
  /from\s+['"]@\/lib\/storage['"]/,
  /from\s+['"]@\/lib\/r2['"]/,
  /from\s+['"]@\/lib\/publish\//,
];
const PUBLIC_RUNTIME_PATHS = [
  path.join(SRC_DIR, "components"),
  path.join(SRC_DIR, "lib", "content"),
  path.join(SRC_DIR, "lib", "gallery"),
  path.join(SRC_DIR, "lib", "publicApi.ts"),
  path.join(SRC_DIR, "lib", "detailRouteParams.ts"),
  path.join(SRC_DIR, "lib", "search", "contracts.ts"),
  path.join(SRC_DIR, "lib", "search", "feedItemSnapshot.ts"),
  path.join(SRC_DIR, "lib", "search", "searchSnapshot.ts"),
];
const FORBIDDEN_PUBLIC_RUNTIME_IMPORT_PATTERNS = [
  ...FORBIDDEN_PUBLIC_IMPORT_PATTERNS,
  /from\s+['"]@\/lib\/schema['"]/,
  /from\s+['"]\.\.\/schema['"]/,
  /from\s+['"]\.\/schema['"]/,
];

async function collectFiles(dir) {
  const info = await stat(dir);
  if (info.isFile()) {
    return dir.match(/\.(ts|tsx)$/) ? [dir] : [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function isPublicAppFile(filePath) {
  const relativePath = path.relative(APP_DIR, filePath);
  const segments = relativePath.split(path.sep);
  return !segments.some((segment) => EXCLUDED_SEGMENTS.has(segment));
}

function isPublicRuntimeFile(filePath) {
  return (
    !filePath.includes(`${path.sep}__tests__${path.sep}`) &&
    !filePath.endsWith(".test.ts") &&
    !filePath.endsWith(".test.tsx")
  );
}

async function main() {
  const files = await collectFiles(APP_DIR);
  const dynamicViolations = [];
  const importViolations = [];
  const runtimeFilesNested = await Promise.all(PUBLIC_RUNTIME_PATHS.map((entry) => collectFiles(entry)));
  const runtimeFiles = runtimeFilesNested.flat();
  const publicRuntimeViolations = [];

  for (const filePath of files) {
    if (!isPublicAppFile(filePath)) {
      continue;
    }

    const source = await readFile(filePath, "utf8");
    const hasViolation = DYNAMIC_PATTERNS.some((pattern) => pattern.test(source));
    if (hasViolation) {
      dynamicViolations.push(path.relative(process.cwd(), filePath));
    }

    const hasForbiddenImport = FORBIDDEN_PUBLIC_IMPORT_PATTERNS.some((pattern) =>
      pattern.test(source)
    );
    if (hasForbiddenImport) {
      importViolations.push(path.relative(process.cwd(), filePath));
    }
  }

  for (const filePath of runtimeFiles) {
    if (!isPublicRuntimeFile(filePath)) {
      continue;
    }

    const source = await readFile(filePath, "utf8");
    const hasForbiddenImport = FORBIDDEN_PUBLIC_RUNTIME_IMPORT_PATTERNS.some((pattern) =>
      pattern.test(source)
    );
    if (hasForbiddenImport) {
      publicRuntimeViolations.push(path.relative(process.cwd(), filePath));
    }
  }

  if (
    dynamicViolations.length === 0 &&
    importViolations.length === 0 &&
    publicRuntimeViolations.length === 0
  ) {
    console.log("architecture check passed");
    return;
  }

  if (dynamicViolations.length > 0) {
    console.error("Public app files must not opt into force-dynamic:");
    for (const filePath of dynamicViolations) {
      console.error(`- ${filePath}`);
    }
  }

  if (importViolations.length > 0) {
    console.error("Public app files must not import DB/Auth/Storage/Publish runtime modules:");
    for (const filePath of importViolations) {
      console.error(`- ${filePath}`);
    }
  }

  if (publicRuntimeViolations.length > 0) {
    console.error("Public runtime modules must not import DB/Auth/Storage/Publish modules or schema.ts:");
    for (const filePath of publicRuntimeViolations) {
      console.error(`- ${filePath}`);
    }
  }

  process.exit(1);
}

main().catch((error) => {
  console.error("architecture check failed");
  console.error(error);
  process.exit(1);
});
