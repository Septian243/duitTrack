export default function LoadingState() {
    return (
        <div className="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center gap-3">
            <div className="loading-spinner relative h-14 w-14" aria-hidden="true">
                {Array.from({ length: 10 }, (_, index) => (
                    <span
                        key={index}
                        className="absolute left-1/2 top-1/2 h-4 w-1.5 rounded-full bg-[#76C457]"
                        style={{
                            transform: `translate(-50%, -50%) rotate(${index * 36}deg) translateY(-20px)`,
                        }}
                    />
                ))}
            </div>
            <p className="text-sm font-medium text-gray-400">Loading...</p>
        </div>
    );
}
