import blockedFunny from "@/assets/blocked-funny.jpg";

const Blocked = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-lg w-full text-center space-y-6">
        <img
          src={blockedFunny}
          alt="Cartoon: Hacker wird von einem riesigen Boxhandschuh aus dem Laptop geworfen"
          width={1024}
          height={1024}
          className="w-64 h-64 sm:w-80 sm:h-80 mx-auto object-contain animate-bounce"
        />
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">
          Nice try. 🥊
        </h1>
        <p className="text-lg text-foreground">
          Dieser Zugang wurde gesperrt.
        </p>
        <p className="text-muted-foreground">
          Wir haben einen Manipulationsversuch an unserem System festgestellt.
          Ihre Verbindung ist ab sofort blockiert und der Vorfall wurde
          protokolliert.
        </p>
        <p className="text-sm text-muted-foreground">
          Falls das ein Missverständnis ist, schreiben Sie uns an{" "}
          <a
            className="text-primary underline"
            href="mailto:support@crypto-borse.com"
          >
            support@crypto-borse.com
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default Blocked;
