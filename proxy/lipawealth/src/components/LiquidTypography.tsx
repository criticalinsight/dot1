import { onMount, type Component, onCleanup } from 'solid-js';
import gsap from 'gsap';

interface LiquidTypographyProps {
    text: string;
    class?: string;
    id: string;
}

const LiquidTypography: Component<LiquidTypographyProps> = (props) => {
    let textRef: HTMLHeadingElement | undefined;
    let filterRef: SVGFETurbulenceElement | undefined;

    onMount(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Animate the displacement map intensity based on mouse movement/position
            if (filterRef) {
                gsap.to(filterRef, {
                    attr: { baseFrequency: 0.01 + (e.clientX / window.innerWidth) * 0.01 },
                    duration: 0.5,
                    ease: 'power2.out'
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        // Ambient liquid animation
        const timeline = gsap.timeline({ repeat: -1, yoyo: true });
        if (filterRef) {
            timeline.to(filterRef, {
                attr: { seed: 100 },
                duration: 10,
                ease: "none"
            });
        }

        onCleanup(() => {
            window.removeEventListener('mousemove', handleMouseMove);
            timeline.kill();
        });
    });

    return (
        <div class="relative group">
            <svg class="absolute hidden">
                <filter id={`liquid-filter-${props.id}`}>
                    <feTurbulence
                        ref={filterRef}
                        type="fractalNoise"
                        baseFrequency="0.01"
                        numOctaves="1"
                        result="noise"
                        seed="1"
                    />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale="20"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </svg>

            <h1
                ref={textRef}
                class={props.class}
                style={{
                    filter: `url(#liquid-filter-${props.id})`,
                    transition: 'filter 0.3s ease-out'
                }}
            >
                {props.text}
            </h1>
        </div>
    );
};

export default LiquidTypography;
