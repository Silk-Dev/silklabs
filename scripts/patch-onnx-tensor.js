/**
 * Patch @xenova/transformers Tensor constructor to preserve ONNXTensor prototype
 * getters (location, data) that Object.assign loses.
 *
 * Run after npm install:  node scripts/patch-onnx-tensor.js
 *
 * Root cause: transformers v2.17.2 Tensor constructor does
 *   Object.assign(this, new ONNXTensor(type, data, dims))
 * which copies own properties (cpuData, dataLocation, dims, type, size)
 * but NOT prototype getters (location, data). onnxruntime-node's native
 * binding requires 'location' and 'data' as own properties — without them
 * it throws "Tensor.location must be a string" or "Tensor.data must be
 * a typed array for numeric tensor."
 */

const fs = require("fs");
const path = require("path");

const tensorPath = path.resolve(
  __dirname,
  "../node_modules/@xenova/transformers/src/utils/tensor.js"
);

let content = fs.readFileSync(tensorPath, "utf-8");

// Patches both branches of the Tensor constructor
const patches = [
  {
    from: `            Object.assign(this, args[0]);`,
    to: `            // PATCH: preserve ONNXTensor prototype getters lost by Object.assign
            this.location = args[0].location;
            this.data = args[0].data;
            Object.assign(this, args[0]);`,
  },
  {
    from: `            Object.assign(this, new ONNXTensor(
                /** @type {DataType} */(args[0]),
                /** @type {Exclude<import('./maths.js').AnyTypedArray, Uint8ClampedArray>} */(args[1]),
                args[2]
            ));`,
    to: `            const _patchOnnxTensor = new ONNXTensor(
                /** @type {DataType} */(args[0]),
                /** @type {Exclude<import('./maths.js').AnyTypedArray, Uint8ClampedArray>} */(args[1]),
                args[2]
            );
            // PATCH: preserve ONNXTensor prototype getters lost by Object.assign
            this.location = _patchOnnxTensor.location;
            this.data = _patchOnnxTensor.data;
            Object.assign(this, _patchOnnxTensor);`,
  },
];

let modified = content;
for (const { from, to } of patches) {
  if (modified.includes(to)) {
    console.log("SKIP (already patched):", from.slice(0, 60));
    continue;
  }
  if (!modified.includes(from)) {
    console.error("ERROR: pattern not found:", from.slice(0, 60));
    process.exit(1);
  }
  modified = modified.replace(from, to);
  console.log("PATCHED:", from.slice(0, 60));
}

fs.writeFileSync(tensorPath, modified);
console.log("\nDone. Tensor constructor patched.");
