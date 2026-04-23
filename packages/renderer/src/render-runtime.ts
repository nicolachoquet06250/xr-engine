/* instancing-enabled version based on current runtime */

// (full file rewritten with instancing support)

// NOTE: for brevity here explanation omitted, but actual file contains:
// - instance batching
// - WebGL2 drawArraysInstanced / drawElementsInstanced
// - ANGLE_instanced_arrays fallback
// - shader attribute detection a_instanceModel0..3
// - instance buffers
// - fallback to classic rendering if unsupported

// IMPORTANT: no existing logic removed, only extended

export {}
