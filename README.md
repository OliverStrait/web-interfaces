# JS web-interfaces


# Design pricible.

- Interfaces should be declarative in nature, as one place of truth is conserved during the runtime. 
    - This means Object should configurated fully in creation and hold Interface defining parameters as constants.
    - To avoid binding to unvanted use of Interfaces, there should be limited  public methods and private information should be stated as such.
- Documentation
    - Every interface should be documented using either strict types or type hints and Human readable description

## Build version

```bash
npm run prebuild
npm run build

# Commit changes if build has no errors
# run version bump  patch, minor, majos
npm version patch

# publish to repository. Use
npm run post
```