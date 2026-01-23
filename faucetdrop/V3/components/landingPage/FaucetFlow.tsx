"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const FaucetFlow = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 0.5));
    }, 20);
    return () => clearInterval(timer);
  }, []);

  // FIXED DESKTOP COORDINATES (centered)
  const nodes = [
    { id: 1, title: "Create a faucet", x: 200, y: 80, icon: "/flow/1.png" },
    { id: 2, title: "Choose a distribution type", x: 600, y: 180, icon: "/flow/2.png" },
    { id: 3, title: "Add tasks, quests or quizzes", x: 200, y: 280, icon: "/flow/3.png" },
    { id: 4, title: "Fund your faucet", x: 600, y: 380, icon: "/flow/4.png" },
    { id: 5, title: "Share your campaign link", x: 200, y: 480, icon: "/flow/5.png" },
    { id: 6, title: "Users participate → Qualify → Drip", x: 600, y: 580, icon: "/flow/6.png" },
  ];

  // Path generation (unchanged)
  const createPathSegments = () => {
    const segments = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i];
      const to = nodes[i + 1];

      const startX = from.x + 60;
      const startY = from.y;

      const endX = to.x - 60;
      const endY = to.y;

      const midX = (startX + endX) / 2;

      segments.push({
        points: [
          { x: startX, y: startY },
          { x: midX, y: startY },
          { x: midX, y: endY },
          { x: endX, y: endY },
        ],
      });
    }

    return segments;
  };

  const pathSegments = createPathSegments();

  const calculateSegmentLength = (points: { x: number; y: number }[]) => {
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  };

  const totalLength = pathSegments.reduce(
    (sum, seg) => sum + calculateSegmentLength(seg.points),
    0
  );

  const getPointAtProgress = (currentProgress: number) => {
    let accumulatedLength = 0;
    const targetLength = (currentProgress / 100) * totalLength;

    for (let segIndex = 0; segIndex < pathSegments.length; segIndex++) {
      const segment = pathSegments[segIndex];
      const segmentLength = calculateSegmentLength(segment.points);

      if (accumulatedLength + segmentLength >= targetLength) {
        const segmentProgress = targetLength - accumulatedLength;

        let subAccum = 0;

        for (let i = 0; i < segment.points.length - 1; i++) {
          const p1 = segment.points[i];
          const p2 = segment.points[i + 1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const subLength = Math.sqrt(dx * dx + dy * dy);

          if (subAccum + subLength >= segmentProgress) {
            const t = (segmentProgress - subAccum) / subLength;
            return {
              x: p1.x + dx * t,
              y: p1.y + dy * t,
            };
          }
          subAccum += subLength;
        }
      }

      accumulatedLength += segmentLength;
    }

    return pathSegments[pathSegments.length - 1].points[3];
  };

  const currentPoint = getPointAtProgress(progress);

  // FIXED desktop canvas size - SVG scales automatically to 100%
  const svgWidth = 800;
  const svgHeight = 700;

  return (
    <div className="w-full mt-30 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-5xl text-white font-extrabold">
            Getting Started
          </h1>
        </motion.div>

        <div className="w-full flex justify-center">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="max-w-4xl mx-auto"
          >
            <defs>
              <linearGradient id="lineGradient">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>

              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background paths */}
            {pathSegments.map((segment, index) => {
              const pathD = `
                M ${segment.points[0].x} ${segment.points[0].y}
                L ${segment.points[1].x} ${segment.points[1].y}
                L ${segment.points[2].x} ${segment.points[2].y}
                L ${segment.points[3].x} ${segment.points[3].y}
              `;

              return (
                <path
                  key={`background-${index}`}
                  d={pathD}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Colored animation path */}
            {pathSegments.map((segment, index) => {
              const pathD = `
                M ${segment.points[0].x} ${segment.points[0].y}
                L ${segment.points[1].x} ${segment.points[1].y}
                L ${segment.points[2].x} ${segment.points[2].y}
                L ${segment.points[3].x} ${segment.points[3].y}
              `;

              const segmentStart =
                (pathSegments
                  .slice(0, index)
                  .reduce(
                    (sum, seg) => sum + calculateSegmentLength(seg.points),
                    0
                  ) /
                  totalLength) *
                100;

              const segmentEnd =
                (pathSegments
                  .slice(0, index + 1)
                  .reduce(
                    (sum, seg) => sum + calculateSegmentLength(seg.points),
                    0
                  ) /
                  totalLength) *
                100;

              if (progress > segmentStart) {
                return (
                  <path
                    key={`animated-${index}`}
                    d={pathD}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                    opacity={progress >= segmentEnd ? 1 : 0.7}
                  />
                );
              }
              return null;
            })}

            {/* Animated dot */}
            {progress > 0 && progress < 100 && (
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="8"
                fill="#fff"
                filter="url(#glow)"
              >
                <animate
                  attributeName="r"
                  values="6;10;6"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Node squares */}
            {nodes.map((node) => (
              <g key={node.id}>
                {/* Node box */}
                <rect
                  x={node.x - 55}
                  y={node.y - 55}
                  width="110"
                  height="110"
                  rx="12"
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth="3"
                  filter="url(#glow)"
                />

                {/* Icon */}
                <foreignObject
                  x={node.x - 40}
                  y={node.y - 40}
                  width="80"
                  height="80"
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <Image
                      src={node.icon}
                      alt="Step icon"
                      width={100}
                      height={100}
                      className="object-contain rounded-2xl"
                    />
                  </div>
                </foreignObject>

                {/* Wrapped text */}
                <text
                  x={node.x}
                  y={node.y + 85}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="600"
                  fill="#e2e8f0"
                >
                  {/* {node.title.split(" ").map((word, i) => ( */}
                    <tspan key={node.id} x={node.x} dy={0}>
                      {node.title}
                    </tspan>
                  {/* ))} */}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FaucetFlow;
