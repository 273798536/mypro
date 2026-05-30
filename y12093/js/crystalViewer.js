import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { elementColors, elementRadii } from '../data/samples.js';

export class CrystalViewer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.atoms = [];
        this.bonds = [];
        this.bondLabels = [];
        this.atomLabels = [];
        this.unitCellHelper = null;
        this.axesHelper = null;
        this.atomGroup = null;
        this.bondGroup = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedAtom = null;
        this.hoveredAtom = null;
        this.currentMaterial = null;
        this.filteredElements = new Set();
        this.showBonds = true;
        this.showBondLabels = false;
        this.showLabels = false;

        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);

        const rect = this.container.getBoundingClientRect();
        
        this.camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 1000);
        this.camera.position.set(10, 8, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(rect.width, rect.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 100;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 15, 10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        const pointLight1 = new THREE.PointLight(0x4488ff, 0.5);
        pointLight1.position.set(-10, -10, -10);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xff4488, 0.3);
        pointLight2.position.set(10, -10, 10);
        this.scene.add(pointLight2);

        this.atomGroup = new THREE.Group();
        this.scene.add(this.atomGroup);

        this.bondGroup = new THREE.Group();
        this.scene.add(this.bondGroup);

        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);

        window.addEventListener('resize', () => this.onResize());
        this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

        this.animate();
    }

    onResize() {
        const rect = this.container.getBoundingClientRect();
        this.camera.aspect = rect.width / rect.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(rect.width, rect.height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    loadCrystal(materialData, options = {}) {
        this.clearCrystal();
        this.currentMaterial = materialData;

        const { repeatX = 1, repeatY = 1, repeatZ = 1, bondThreshold = 2.5 } = options;

        const unitCell = materialData.unitCell;
        const a = unitCell.a;
        const b = unitCell.b;
        const c = unitCell.c;

        const allAtoms = [];
        for (let ix = 0; ix < repeatX; ix++) {
            for (let iy = 0; iy < repeatY; iy++) {
                for (let iz = 0; iz < repeatZ; iz++) {
                    materialData.atoms.forEach((atom, idx) => {
                        allAtoms.push({
                            id: `${ix}_${iy}_${iz}_${idx}`,
                            element: atom.element,
                            x: (atom.x + ix) * a,
                            y: (atom.y + iy) * b,
                            z: (atom.z + iz) * c,
                            fractionalX: atom.x,
                            fractionalY: atom.y,
                            fractionalZ: atom.z,
                            cellX: ix,
                            cellY: iy,
                            cellZ: iz
                        });
                    });
                }
            }
        }

        allAtoms.forEach((atom, index) => {
            const color = new THREE.Color(elementColors[atom.element] || elementColors.default);
            const radius = (elementRadii[atom.element] || elementRadii.default) * 0.5;
            
            const geometry = new THREE.SphereGeometry(radius, 32, 32);
            const material = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.3,
                roughness: 0.4
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(atom.x, atom.y, atom.z);
            sphere.castShadow = true;
            sphere.receiveShadow = true;
            sphere.userData = { ...atom, index };
            
            this.atomGroup.add(sphere);
            this.atoms.push(sphere);
        });

        this.calculateBonds(allAtoms, bondThreshold);
        this.drawUnitCell(unitCell, repeatX, repeatY, repeatZ);

        const elements = [...new Set(materialData.atoms.map(a => a.element))];
        this.filteredElements = new Set(elements);

        const center = this.getCenter();
        this.camera.position.set(center.x + 10, center.y + 8, center.z + 10);
        this.controls.target.copy(center);
        this.controls.update();

        return {
            atomCount: allAtoms.length,
            bondCount: this.bonds.length,
            elements: elements
        };
    }

    calculateBonds(atoms, threshold) {
        this.clearBonds();

        for (let i = 0; i < atoms.length; i++) {
            for (let j = i + 1; j < atoms.length; j++) {
                const atom1 = atoms[i];
                const atom2 = atoms[j];

                const dx = atom2.x - atom1.x;
                const dy = atom2.y - atom1.y;
                const dz = atom2.z - atom1.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (distance <= threshold && distance > 0.1) {
                    this.createBond(atom1, atom2, distance, i, j);
                }
            }
        }
    }

    createBond(atom1, atom2, distance, idx1, idx2) {
        const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
        const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);

        const geometry = new THREE.CylinderGeometry(0.08, 0.08, distance, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.5,
            roughness: 0.3
        });

        const cylinder = new THREE.Mesh(geometry, material);
        cylinder.position.copy(start);
        cylinder.position.lerp(end, 0.5);
        cylinder.lookAt(end);
        cylinder.rotateX(Math.PI / 2);
        cylinder.userData = { atom1: idx1, atom2: idx2, distance, element1: atom1.element, element2: atom2.element };

        this.bondGroup.add(cylinder);
        this.bonds.push(cylinder);

        if (this.showBondLabels) {
            this.createBondLabel(start, end, distance.toFixed(3));
        }
    }

    createBondLabel(start, end, text) {
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 32;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ffffff';
        context.font = '14px Arial';
        context.textAlign = 'center';
        context.fillText(text + ' Å', canvas.width / 2, 22);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(midPoint);
        sprite.scale.set(2, 0.5, 1);
        
        this.bondGroup.add(sprite);
        this.bondLabels.push(sprite);
    }

    drawUnitCell(unitCell, repeatX, repeatY, repeatZ) {
        if (this.unitCellHelper) {
            this.scene.remove(this.unitCellHelper);
        }

        const a = unitCell.a * repeatX;
        const b = unitCell.b * repeatY;
        const c = unitCell.c * repeatZ;

        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            0, 0, 0, a, 0, 0,
            a, 0, 0, a, 0, c,
            a, 0, c, 0, 0, c,
            0, 0, c, 0, 0, 0,
            0, b, 0, a, b, 0,
            a, b, 0, a, b, c,
            a, b, c, 0, b, c,
            0, b, c, 0, b, 0,
            0, 0, 0, 0, b, 0,
            a, 0, 0, a, b, 0,
            a, 0, c, a, b, c,
            0, 0, c, 0, b, c
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        
        const material = new THREE.LineBasicMaterial({ 
            color: 0x00d4ff, 
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        
        this.unitCellHelper = new THREE.LineSegments(geometry, material);
        this.scene.add(this.unitCellHelper);
    }

    clearCrystal() {
        this.atoms.forEach(atom => this.atomGroup.remove(atom));
        this.atoms = [];
        this.clearBonds();
        if (this.unitCellHelper) {
            this.scene.remove(this.unitCellHelper);
            this.unitCellHelper = null;
        }
        this.selectedAtom = null;
    }

    clearBonds() {
        this.bonds.forEach(bond => this.bondGroup.remove(bond));
        this.bonds = [];
        this.bondLabels.forEach(label => this.bondGroup.remove(label));
        this.bondLabels = [];
    }

    filterByElement(element, visible) {
        if (visible) {
            this.filteredElements.add(element);
        } else {
            this.filteredElements.delete(element);
        }

        this.atoms.forEach(atom => {
            atom.visible = this.filteredElements.has(atom.userData.element);
        });

        this.bonds.forEach(bond => {
            const el1 = bond.userData.element1;
            const el2 = bond.userData.element2;
            bond.visible = this.filteredElements.has(el1) && this.filteredElements.has(el2);
        });
    }

    toggleBonds(show) {
        this.showBonds = show;
        this.bondGroup.visible = show;
    }

    toggleBondLabels(show) {
        this.showBondLabels = show;
        this.bondLabels.forEach(label => label.visible = show);
    }

    toggleUnitCell(show) {
        if (this.unitCellHelper) {
            this.unitCellHelper.visible = show;
        }
    }

    toggleAxes(show) {
        this.axesHelper.visible = show;
    }

    toggleLabels(show) {
        this.showLabels = show;
        this.updateAtomLabels();
    }

    updateAtomLabels() {
        this.atomLabels.forEach(label => this.atomGroup.remove(label));
        this.atomLabels = [];

        if (!this.showLabels) return;

        this.atoms.forEach(atom => {
            if (!atom.visible) return;
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 32;
            
            context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = elementColors[atom.userData.element] || '#ffffff';
            context.font = 'bold 14px Arial';
            context.textAlign = 'center';
            context.fillText(atom.userData.element, canvas.width / 2, 22);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(atom.position);
            sprite.position.y += 0.8;
            sprite.scale.set(1.5, 0.75, 1);
            
            this.atomGroup.add(sprite);
            this.atomLabels.push(sprite);
        });
    }

    getCenter() {
        if (this.atoms.length === 0) return new THREE.Vector3(0, 0, 0);

        const center = new THREE.Vector3();
        this.atoms.forEach(atom => center.add(atom.position));
        center.divideScalar(this.atoms.length);
        return center;
    }

    onClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.atoms);

        if (intersects.length > 0) {
            this.selectAtom(intersects[0].object);
        } else {
            this.deselectAtom();
        }
    }

    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.atoms);

        if (this.hoveredAtom) {
            this.hoveredAtom.material.emissive.setHex(0x000000);
            this.hoveredAtom = null;
        }

        if (intersects.length > 0) {
            this.hoveredAtom = intersects[0].object;
            if (this.hoveredAtom !== this.selectedAtom) {
                this.hoveredAtom.material.emissive.setHex(0x333333);
            }
        }

        this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
    }

    selectAtom(atom) {
        if (this.selectedAtom) {
            this.selectedAtom.material.emissive.setHex(0x000000);
        }

        this.selectedAtom = atom;
        atom.material.emissive.setHex(0x444400);

        const bondedAtoms = this.getBondedAtoms(atom.userData.index);
        
        return {
            atom: atom.userData,
            bondedAtoms: bondedAtoms
        };
    }

    deselectAtom() {
        if (this.selectedAtom) {
            this.selectedAtom.material.emissive.setHex(0x000000);
            this.selectedAtom = null;
        }
        return null;
    }

    getBondedAtoms(atomIndex) {
        const bonded = [];
        this.bonds.forEach(bond => {
            if (bond.userData.atom1 === atomIndex) {
                bonded.push({
                    atom: this.atoms[bond.userData.atom2].userData,
                    distance: bond.userData.distance
                });
            } else if (bond.userData.atom2 === atomIndex) {
                bonded.push({
                    atom: this.atoms[bond.userData.atom1].userData,
                    distance: bond.userData.distance
                });
            }
        });
        return bonded;
    }

    selectAtomByIndex(index) {
        if (index >= 0 && index < this.atoms.length) {
            return this.selectAtom(this.atoms[index]);
        }
        return null;
    }

    getViewState() {
        return {
            cameraPosition: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            },
            cameraTarget: {
                x: this.controls.target.x,
                y: this.controls.target.y,
                z: this.controls.target.z
            }
        };
    }

    setViewState(state) {
        if (state.cameraPosition) {
            this.camera.position.set(
                state.cameraPosition.x,
                state.cameraPosition.y,
                state.cameraPosition.z
            );
        }
        if (state.cameraTarget) {
            this.controls.target.set(
                state.cameraTarget.x,
                state.cameraTarget.y,
                state.cameraTarget.z
            );
        }
        this.controls.update();
    }

    getAllAtoms() {
        return this.atoms.map(atom => atom.userData);
    }

    getAllBonds() {
        return this.bonds.map(bond => ({
            atom1: bond.userData.atom1,
            atom2: bond.userData.atom2,
            distance: bond.userData.distance,
            element1: bond.userData.element1,
            element2: bond.userData.element2
        }));
    }

    dispose() {
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}