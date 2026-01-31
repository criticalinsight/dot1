import { onMount, type Component, onCleanup } from 'solid-js';
import * as THREE from 'three';

const FluidBackground: Component = () => {
    let containerRef: HTMLDivElement | undefined;
    let frameId: number;
    let renderer: THREE.WebGLRenderer;
    let geometry: THREE.IcosahedronGeometry;
    let material: THREE.MeshPhysicalMaterial;

    onMount(() => {
        if (!containerRef) return;

        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
        containerRef.appendChild(renderer.domElement);

        // Background gradient
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = 256;
        bgCanvas.height = 256;
        const ctx = bgCanvas.getContext('2d')!;
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, '#fdfdfd');
        grad.addColorStop(1, '#ffffff');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        const bgTex = new THREE.CanvasTexture(bgCanvas);
        scene.background = bgTex;

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffffff, 2);
        spotLight.position.set(10, 20, 10);
        scene.add(spotLight);

        material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.05,
            transmission: 0.95,
            thickness: 0.5,
            ior: 1.5,
            iridescence: isMobile ? 0 : 0.4,
            iridescenceIOR: 1.3,
            sheen: 1,
            sheenColor: 0x10b981,
            clearcoat: 1.0,
        });

        geometry = new THREE.IcosahedronGeometry(1, isMobile ? 32 : 128);
        const blobMesh = new THREE.Mesh(geometry, material);
        scene.add(blobMesh);

        camera.position.z = 2.5;

        const animate = () => {
            frameId = requestAnimationFrame(animate);
            if (blobMesh) {
                blobMesh.rotation.x += 0.002;
                blobMesh.rotation.y += 0.003;

                const time = Date.now() * 0.0005;
                const positions = blobMesh.geometry.attributes.position;
                if (positions instanceof THREE.BufferAttribute) {
                    const originalRadius = (blobMesh.geometry as THREE.IcosahedronGeometry).parameters.radius;
                    const tempArr = positions.array as Float32Array;
                    for (let i = 0; i < positions.count; i++) {
                        const x = positions.getX(i);
                        const y = positions.getY(i);
                        const z = positions.getZ(i);

                        const p = new THREE.Vector3(x, y, z);
                        p.normalize();

                        const wave = Math.sin(p.x * 2 + time) * 0.15 +
                            Math.sin(p.y * 3 + time) * 0.12 +
                            Math.sin(p.z * 1.5 + time) * 0.08;

                        p.multiplyScalar(originalRadius + wave);
                        tempArr[i * 3] = p.x;
                        tempArr[i * 3 + 1] = p.y;
                        tempArr[i * 3 + 2] = p.z;
                    }
                    positions.needsUpdate = true;
                }
            }
            renderer.render(scene, camera);
        };
        animate();

        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', onResize);

        onCleanup(() => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(frameId);
            if (containerRef && renderer.domElement) {
                containerRef.removeChild(renderer.domElement);
            }
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        });
    });

    return (
        <>
            <div ref={containerRef} class="fixed inset-0 w-full h-full -z-10 pointer-events-none opacity-40 transition-opacity duration-1000" />
            <div class="fixed inset-0 w-full h-full -z-5 pointer-events-none opacity-20 mix-blend-overlay" style={{
                "background-image": "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')"
            }} />
        </>
    );
};

export default FluidBackground;
