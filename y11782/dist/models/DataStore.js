"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataStore = exports.DataStore = void 0;
const uuid_1 = require("uuid");
class DataStore {
    constructor() {
        this.courses = new Map();
        this.prerequisites = [];
        this.semesterPlans = [];
        this.alternativeCourses = [];
        this.studentGrades = [];
        this.history = [];
        this.currentSource = 'manual';
    }
    setSource(source) {
        this.currentSource = source;
    }
    getSource() {
        return this.currentSource;
    }
    addCourse(course) {
        const fullCourse = { ...course, source: this.currentSource };
        this.courses.set(course.id, fullCourse);
        this.recordHistory('modify', `添加课程: ${course.name} (${course.id})`, [
            { field: 'courses', oldValue: null, newValue: fullCourse }
        ]);
        return fullCourse;
    }
    addCourses(courses) {
        return courses.map(c => this.addCourse(c));
    }
    getCourse(id) {
        return this.courses.get(id);
    }
    getAllCourses() {
        return Array.from(this.courses.values());
    }
    updateCourse(id, updates) {
        const course = this.courses.get(id);
        if (!course)
            return undefined;
        const oldValue = { ...course };
        const updated = { ...course, ...updates };
        this.courses.set(id, updated);
        this.recordHistory('modify', `更新课程: ${course.name} (${id})`, [
            { field: 'courses', oldValue, newValue: updated }
        ]);
        return updated;
    }
    removeCourse(id) {
        const course = this.courses.get(id);
        if (!course)
            return false;
        this.courses.delete(id);
        this.prerequisites = this.prerequisites.filter(p => p.courseId !== id && p.prerequisiteId !== id);
        this.recordHistory('modify', `删除课程: ${course.name} (${id})`, [
            { field: 'courses', oldValue: course, newValue: null }
        ]);
        return true;
    }
    addPrerequisite(prereq) {
        const fullPrereq = { ...prereq, source: this.currentSource };
        this.prerequisites.push(fullPrereq);
        const course = this.courses.get(prereq.courseId);
        const prereqCourse = this.courses.get(prereq.prerequisiteId);
        this.recordHistory('modify', `添加先修关系: ${prereqCourse?.name || prereq.prerequisiteId} → ${course?.name || prereq.courseId}`, [
            { field: 'prerequisites', oldValue: null, newValue: fullPrereq }
        ]);
        return fullPrereq;
    }
    addPrerequisites(prereqs) {
        return prereqs.map(p => this.addPrerequisite(p));
    }
    getAllPrerequisites() {
        return [...this.prerequisites];
    }
    removePrerequisite(courseId, prerequisiteId) {
        const index = this.prerequisites.findIndex(p => p.courseId === courseId && p.prerequisiteId === prerequisiteId);
        if (index === -1)
            return false;
        const removed = this.prerequisites.splice(index, 1)[0];
        this.recordHistory('modify', `删除先修关系: ${prerequisiteId} → ${courseId}`, [
            { field: 'prerequisites', oldValue: removed, newValue: null }
        ]);
        return true;
    }
    addSemesterPlan(plan) {
        const fullPlan = { ...plan, source: this.currentSource };
        this.semesterPlans.push(fullPlan);
        this.recordHistory('modify', `添加学期计划: ${plan.studentGrade}年级 第${plan.semester}学期`, [
            { field: 'semesterPlans', oldValue: null, newValue: fullPlan }
        ]);
        return fullPlan;
    }
    addSemesterPlans(plans) {
        return plans.map(p => this.addSemesterPlan(p));
    }
    getAllSemesterPlans() {
        return [...this.semesterPlans];
    }
    addAlternativeCourse(alt) {
        const fullAlt = { ...alt, source: this.currentSource };
        this.alternativeCourses.push(fullAlt);
        const original = this.courses.get(alt.originalId);
        const alternative = this.courses.get(alt.alternativeId);
        this.recordHistory('modify', `添加替代课程: ${original?.name || alt.originalId} → ${alternative?.name || alt.alternativeId}`, [
            { field: 'alternativeCourses', oldValue: null, newValue: fullAlt }
        ]);
        return fullAlt;
    }
    addAlternativeCourses(alts) {
        return alts.map(a => this.addAlternativeCourse(a));
    }
    getAllAlternativeCourses() {
        return [...this.alternativeCourses];
    }
    getAlternativesFor(courseId) {
        return this.alternativeCourses.filter(a => a.originalId === courseId);
    }
    addStudentGrade(grade) {
        const fullGrade = { ...grade, source: this.currentSource };
        this.studentGrades.push(fullGrade);
        this.recordHistory('modify', `添加学生: ${grade.name} (${grade.id})`, [
            { field: 'studentGrades', oldValue: null, newValue: fullGrade }
        ]);
        return fullGrade;
    }
    addStudentGrades(grades) {
        return grades.map(g => this.addStudentGrade(g));
    }
    getAllStudentGrades() {
        return [...this.studentGrades];
    }
    importBundle(bundle, source) {
        const oldSource = this.currentSource;
        this.currentSource = source;
        this.clearAll();
        this.addCourses(bundle.courses);
        this.addPrerequisites(bundle.prerequisites);
        this.addSemesterPlans(bundle.semesterPlans);
        this.addAlternativeCourses(bundle.alternativeCourses);
        this.addStudentGrades(bundle.studentGrades);
        this.recordHistory('import', `从 ${source} 导入数据`, []);
        this.currentSource = oldSource;
    }
    exportBundle() {
        return {
            courses: this.getAllCourses(),
            prerequisites: this.getAllPrerequisites(),
            semesterPlans: this.getAllSemesterPlans(),
            alternativeCourses: this.getAllAlternativeCourses(),
            studentGrades: this.getAllStudentGrades(),
        };
    }
    clearAll() {
        this.courses.clear();
        this.prerequisites = [];
        this.semesterPlans = [];
        this.alternativeCourses = [];
        this.studentGrades = [];
    }
    getHistory() {
        return [...this.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    recordHistory(action, description, changes) {
        const record = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
            action,
            description,
            dataSource: this.currentSource,
            changes,
        };
        this.history.push(record);
    }
    recordCheck() {
        this.recordHistory('check', '执行课程先修关系检查', []);
    }
    recordExport(format, path) {
        this.recordHistory('export', `导出${format}格式报告: ${path}`, []);
    }
}
exports.DataStore = DataStore;
exports.dataStore = new DataStore();
//# sourceMappingURL=DataStore.js.map