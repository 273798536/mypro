"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopologicalSort = void 0;
class TopologicalSort {
    constructor(courses, prerequisites) {
        this.graph = new Map();
        this.inDegree = new Map();
        this.courses = [];
        this.prerequisites = [];
        this.courses = courses;
        this.prerequisites = prerequisites;
        this.buildGraph();
    }
    buildGraph() {
        this.courses.forEach(course => {
            this.graph.set(course.id, { id: course.id, neighbors: [] });
            this.inDegree.set(course.id, 0);
        });
        this.prerequisites.forEach(prereq => {
            const courseId = prereq.courseId;
            const prereqId = prereq.prerequisiteId;
            if (!this.graph.has(courseId)) {
                this.graph.set(courseId, { id: courseId, neighbors: [] });
                this.inDegree.set(courseId, 0);
            }
            if (!this.graph.has(prereqId)) {
                this.graph.set(prereqId, { id: prereqId, neighbors: [] });
                this.inDegree.set(prereqId, 0);
            }
            const node = this.graph.get(prereqId);
            if (!node.neighbors.includes(courseId)) {
                node.neighbors.push(courseId);
                this.inDegree.set(courseId, (this.inDegree.get(courseId) || 0) + 1);
            }
        });
    }
    sort() {
        const result = [];
        const inDegreeCopy = new Map(this.inDegree);
        const queue = [];
        this.graph.forEach((_, id) => {
            if (inDegreeCopy.get(id) === 0) {
                queue.push(id);
            }
        });
        while (queue.length > 0) {
            const nodeId = queue.shift();
            result.push(nodeId);
            const node = this.graph.get(nodeId);
            if (node) {
                node.neighbors.forEach(neighbor => {
                    const newDegree = (inDegreeCopy.get(neighbor) || 0) - 1;
                    inDegreeCopy.set(neighbor, newDegree);
                    if (newDegree === 0) {
                        queue.push(neighbor);
                    }
                });
            }
        }
        const hasCycle = result.length !== this.graph.size;
        const cycles = hasCycle ? this.findAllCycles() : [];
        const inDegreeRecord = {};
        this.inDegree.forEach((value, key) => {
            inDegreeRecord[key] = value;
        });
        return {
            order: result,
            hasCycle,
            cycles,
            inDegree: inDegreeRecord,
        };
    }
    findAllCycles(maxCycles = 50) {
        const cycles = [];
        const visited = new Set();
        const onStack = new Set();
        const path = [];
        const dfs = (nodeId) => {
            if (cycles.length >= maxCycles)
                return;
            visited.add(nodeId);
            onStack.add(nodeId);
            path.push(nodeId);
            const node = this.graph.get(nodeId);
            if (node) {
                for (const neighbor of node.neighbors) {
                    if (cycles.length >= maxCycles)
                        return;
                    if (!visited.has(neighbor)) {
                        dfs(neighbor);
                    }
                    else if (onStack.has(neighbor)) {
                        const cycleStart = path.indexOf(neighbor);
                        if (cycleStart !== -1) {
                            const cycle = path.slice(cycleStart);
                            const normalizedCycle = this.normalizeCycle([...cycle, neighbor]);
                            if (!this.cycleExists(cycles, normalizedCycle)) {
                                cycles.push(normalizedCycle);
                            }
                        }
                    }
                }
            }
            path.pop();
            onStack.delete(nodeId);
        };
        this.graph.forEach((_, id) => {
            if (!visited.has(id)) {
                dfs(id);
            }
        });
        return cycles;
    }
    normalizeCycle(cycle) {
        const numbers = cycle.map(c => parseInt(c.replace(/\D/g, '') || '0'));
        const minValue = Math.min(...numbers);
        const minIndex = numbers.indexOf(minValue);
        return [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
    }
    cycleExists(cycles, target) {
        return cycles.some(cycle => cycle.length === target.length &&
            cycle.every((val, idx) => val === target[idx]));
    }
    explainCycle(cycle) {
        const courseNames = cycle.map(id => {
            const course = this.courses.find(c => c.id === id);
            return course ? `${course.name} (${id})` : id;
        });
        return `循环路径: ${courseNames.join(' → ')}`;
    }
    getPrerequisitePath(fromCourse, toCourse) {
        const visited = new Set();
        const path = [];
        const dfs = (current) => {
            if (current === toCourse) {
                path.push(current);
                return true;
            }
            if (visited.has(current)) {
                return false;
            }
            visited.add(current);
            path.push(current);
            const node = this.graph.get(current);
            if (node) {
                for (const neighbor of node.neighbors) {
                    if (dfs(neighbor)) {
                        return true;
                    }
                }
            }
            path.pop();
            return false;
        };
        if (dfs(fromCourse)) {
            return path;
        }
        return null;
    }
    getAllPaths(fromCourse, toCourse, maxDepth = 10) {
        const paths = [];
        const path = [];
        const visited = new Set();
        const dfs = (current, depth) => {
            if (current === toCourse) {
                paths.push([...path, current]);
                return;
            }
            if (visited.has(current) || depth > maxDepth) {
                return;
            }
            visited.add(current);
            path.push(current);
            const node = this.graph.get(current);
            if (node) {
                node.neighbors.forEach(neighbor => {
                    dfs(neighbor, depth + 1);
                });
            }
            path.pop();
            visited.delete(current);
        };
        dfs(fromCourse, 0);
        return paths;
    }
    getInvolvedInCycles() {
        const cycles = this.findAllCycles();
        const involved = new Set();
        cycles.forEach(cycle => {
            cycle.forEach(id => involved.add(id));
        });
        return involved;
    }
}
exports.TopologicalSort = TopologicalSort;
//# sourceMappingURL=TopologicalSort.js.map