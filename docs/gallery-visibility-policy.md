# Gallery 展示策略（暂时隐藏入口）

## 当前决策

主导航（底部导航）暂时不展示 `gallery` 入口，但保留 `gallery` 全部实现代码（路由、数据读取、组件均不删除）。

## 为什么暂时不展示

1. 首页当前已承载混合内容（moment + post 图片），并覆盖单图/多图场景。
2. 现阶段 `gallery` 的主要逻辑是把 moment/post 图片做平铺聚合，与首页信息价值重叠较高。
3. 在信息架构仍在收敛阶段时，减少一个一级入口可以降低认知负担。

## 为什么保留实现

1. `gallery` 仍可作为后续的图片发现页（如策展流、标签过滤、专题沉浸浏览）。
2. 保留实现可避免未来恢复时重复开发与回归成本。
3. 已有路由与能力可继续用于内部验证、灰度或 A/B 实验。

## 恢复方式

修改 [BottomNav.tsx](/Users/wanghao/Project/tdp-lite/src/components/BottomNav.tsx) 中 `tabs` 配置，将 `gallery` 的 `showInMainNav` 设为 `true`（或移除该字段）即可恢复主导航展示，无需改动路由层代码。
