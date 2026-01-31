import { onMount, onCleanup } from 'solid-js';
import * as THREE from 'three';

/**
 * Atmosphere Component
 * Renders a high-fidelity WebGL background using Three.js.
 * Features a refractive, flowing mesh that reacts to scroll/mouse.
 */
export const Atmosphere = () => {
    let canvasRef: HTMLCanvasElement | undefined;

    onMount(() => {
        if (!canvasRef) return;

        // --- Scene Setup ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef,
            alpha: true,
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // --- Geometry: Liquid Mesh ---
        const geometry = new THREE.IcosahedronGeometry(1.5, 32);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x6366f1, // Blue-Indigo
            transmission: 0.9,
            thickness: 1.0,
            roughness: 0.1,
            metalness: 0.1,
            ior: 1.5,
            specularIntensity: 1,
            specularColor: new THREE.Color(0xffffff),
            envMapIntensity: 1.5,
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // --- Lighting ---
        const light1 = new THREE.DirectionalLight(0xffffff, 2);
        light1.position.set(2, 2, 5);
        scene.add(light1);

        const light2 = new THREE.PointLight(0x8b5cf6, 10);
        light2.position.set(-2, -2, 2);
        scene.add(light2);

        camera.position.z = 4;

        // --- Interaction State ---
        let mouseX = 0;
        let mouseY = 0;
        let scrollPos = 0;

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        };

        const handleScroll = () => {
            scrollPos = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('scroll', handleScroll);

        // --- Animation Loop ---
        let frameId: number;
        const coreTime = Date.now();

        const animate = () => {
            frameId = requestAnimationFrame(animate);

            const time = (Date.now() - coreTime) * 0.001;

            // Subtle Rotation
            mesh.rotation.x = time * 0.1 + mouseY * 0.2;
            mesh.rotation.y = time * 0.15 + mouseX * 0.2;

            // Scale pulse based on "activity"
            const scale = 1 + Math.sin(time * 0.5) * 0.05 + scrollPos * 0.2;
            mesh.scale.set(scale, scale, scale);

            // Noise simulation (vertex displacement would be better in a shader)
            mesh.position.y = Math.sin(time * 0.3) * 0.1;

            renderer.render(scene, camera);
        };

        animate();

        // --- Cleanup ---
        onCleanup(() => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('scroll', handleScroll);
            renderer.dispose();
            geometry.dispose();
            material.dispose();
        });

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
    });

    return (
        <canvas
            ref={canvasRef}
            class="fixed inset-0 -z-10 pointer-events-none opacity-40 brightness-50 contrast-125"
            style={{ filter: "blur(40px)" }}
        />
    );
};
