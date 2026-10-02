import Lottie from "lottie-react";

const animationData = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 90,
  w: 200,
  h: 200,
  nm: "scan-loader",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "spinner",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [0] }, { t: 90, s: [360] }] },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "el", p: { a: 0, k: [0, -44] }, s: { a: 0, k: [20, 20] } },
            { ty: "fl", c: { a: 0, k: [0.09, 0.36, 0.83, 1] }, o: { a: 0, k: 100 } },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 }
            }
          ]
        }
      ],
      ip: 0,
      op: 90,
      st: 0
    }
  ]
};

export default function LoadingAnimation({ label = "Scanning your website..." }) {
  return (
    <div className="loading-animation">
      <Lottie animationData={animationData} loop className="loading-lottie" />
      <div>
        <strong>{label}</strong>
        <p>Running multiple checks in parallel and building a simple report.</p>
      </div>
    </div>
  );
}
