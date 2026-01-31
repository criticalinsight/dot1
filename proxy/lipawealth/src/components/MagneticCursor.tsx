import { onMount, onCleanup, type Component } from 'solid-js';
import gsap from 'gsap';

const MagneticCursor: Component = () => {
    let cursorRef: HTMLDivElement | undefined;
    let trailRefs: HTMLDivElement[] = [];

    onMount(() => {
        if (window.matchMedia('(pointer: coarse)').matches) return;

        const cursor = cursorRef!;
        const trails = trailRefs!;

        const xSetters = [
            gsap.quickSetter(cursor, "x", "px"),
            ...trails.map(t => gsap.quickSetter(t, "x", "px"))
        ];
        const ySetters = [
            gsap.quickSetter(cursor, "y", "px"),
            ...trails.map(t => gsap.quickSetter(t, "y", "px"))
        ];

        const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const mouse = { x: pos.x, y: pos.y };

        const onMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const ticker = () => {
            const dt = 1.0 - Math.pow(1.0 - 0.35, gsap.ticker.deltaRatio());
            const trailDt = 1.0 - Math.pow(1.0 - 0.15, gsap.ticker.deltaRatio());

            pos.x += (mouse.x - pos.x) * dt;
            pos.y += (mouse.y - pos.y) * dt;

            xSetters[0](pos.x);
            ySetters[0](pos.y);

            trails.forEach((trail, i) => {
                const targetX = i === 0 ? pos.x : gsap.getProperty(trails[i - 1], "x") as number;
                const targetY = i === 0 ? pos.y : gsap.getProperty(trails[i - 1], "y") as number;

                const currentX = gsap.getProperty(trail, "x") as number;
                const currentY = gsap.getProperty(trail, "y") as number;

                const nextX = currentX + (targetX - currentX) * trailDt;
                const nextY = currentY + (targetY - currentY) * trailDt;

                xSetters[i + 1](nextX);
                ySetters[i + 1](nextY);

                const dist = Math.hypot(targetX - currentX, targetY - currentY);
                const scale = 1 + Math.min(dist / 50, 0.5);
                gsap.set(trail, { scale: 1 / scale, opacity: 0.5 / (i + 1) });
            });
        };

        gsap.ticker.add(ticker);
        window.addEventListener('mousemove', onMouseMove);

        const onMouseDown = () => gsap.to(cursor, { scale: 0.5, duration: 0.2 });
        const onMouseUp = () => gsap.to(cursor, { scale: 1, duration: 0.2 });

        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);

        const onEnter = () => {
            gsap.to(cursor, { scale: 0, duration: 0.3 });
            trails.forEach((t, i) => gsap.to(t, { scale: 3 + i, opacity: 0.1, duration: 0.4, border: '1px solid rgba(16, 185, 129, 0.5)' }));
        };
        const onLeave = () => {
            gsap.to(cursor, { scale: 1, duration: 0.3 });
            trails.forEach((t, i) => gsap.to(t, { scale: 1, opacity: 0.5 / (i + 1), duration: 0.4, border: '1px solid rgba(16, 185, 129, 0.3)' }));
        };

        const interactables = document.querySelectorAll('button, a, .interactable');
        interactables.forEach(el => {
            el.addEventListener('mouseenter', onEnter);
            el.addEventListener('mouseleave', onLeave);
        });

        onCleanup(() => {
            gsap.ticker.remove(ticker);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            interactables.forEach(el => {
                el.removeEventListener('mouseenter', onEnter);
                el.removeEventListener('mouseleave', onLeave);
            });
        });
    });

    return (
        <div class="pointer-events-none fixed inset-0 z-[9999] overflow-hidden hidden md:block">
            <div
                ref={cursorRef}
                class="absolute top-0 left-0 w-2 h-2 bg-emerald-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />
            {[0, 1, 2].map((_, i) => (
                <div
                    ref={(el) => (trailRefs[i] = el!)}
                    class="absolute top-0 left-0 w-8 h-8 border border-emerald-500/30 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{ "transition-property": "opacity, scale" }}
                ></div>
            ))}
        </div>
    );
};

export default MagneticCursor;
