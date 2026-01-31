import { onMount, type Component, mergeProps } from 'solid-js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface RevealTextProps {
    text: string;
    class?: string;
    type?: 'chars' | 'words' | 'lines';
    delay?: number;
    stagger?: number;
}

const RevealText: Component<RevealTextProps> = (_props) => {
    const props = mergeProps({ type: 'words', delay: 0, stagger: 0.02 }, _props);
    let containerRef: HTMLDivElement | undefined;

    onMount(() => {
        if (!containerRef) return;

        const elements = containerRef.children;

        gsap.fromTo(
            elements,
            {
                y: 100,
                opacity: 0,
                rotateX: -80,
                filter: 'blur(10px)',
            },
            {
                y: 0,
                opacity: 1,
                rotateX: 0,
                filter: 'blur(0px)',
                duration: 2.2,
                stagger: props.stagger,
                ease: 'power4.out',
                delay: props.delay,
                scrollTrigger: {
                    trigger: containerRef,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse',
                },
            }
        );
    });

    const splitContent = () => {
        if (props.type === 'chars') {
            return props.text.split('').map((char) => (
                <span class="inline-block transform-style-3d origin-bottom" style={{ "white-space": "pre" }}>{char}</span>
            ));
        }
        // Words
        return props.text.split(' ').map((word) => (
            <span class="inline-block mr-[0.2em] overflow-hidden">
                <span class="inline-block transform-style-3d origin-bottom">{word}</span>
            </span>
        ));
    };

    return (
        <div ref={containerRef} class={props.class} aria-label={props.text}>
            {splitContent()}
        </div>
    );
};

export default RevealText;
