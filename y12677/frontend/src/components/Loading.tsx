interface Props {
  message?: string;
}

export default function Loading({ message = '加载中...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-text-gray">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
