#include <emscripten/emscripten.h>
#include <vector>
#include <algorithm>
#include <cmath>

extern "C" {

EMSCRIPTEN_KEEPALIVE
float* cull_nodes(
    float* positions,
    int count,
    float cx, float cy,
    float vw, float vh,
    float scale,
    float node_radius,
    int* out_count
) {
    float inv_scale = 1.0f / scale;
    float half_w = vw * 0.5f * inv_scale;
    float half_h = vh * 0.5f * inv_scale;
    float left = cx - half_w - node_radius;
    float right = cx + half_w + node_radius;
    float top = cy - half_h - node_radius;
    float bottom = cy + half_h + node_radius;

    std::vector<int> visible;
    visible.reserve(count);

    for (int i = 0; i < count; i++) {
        float x = positions[i * 2];
        float y = positions[i * 2 + 1];
        if (x >= left && x <= right && y >= top && y <= bottom) {
            visible.push_back(i);
        }
    }

    int n = (int)visible.size();
    float* result = (float*)malloc((n * 2 + 1) * sizeof(float));
    result[0] = (float)n;
    for (int i = 0; i < n; i++) {
        result[i * 2 + 1] = (float)visible[i];
        result[i * 2 + 2] = 0.0f;
    }

    *out_count = n;
    return result;
}

EMSCRIPTEN_KEEPALIVE
void free_result(float* ptr) {
    free(ptr);
}

} // extern "C"
