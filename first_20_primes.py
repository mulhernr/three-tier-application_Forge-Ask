"""Print the first 20 prime numbers."""


def is_prime(n: int) -> bool:
    """Return True if n is a prime number."""
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    for i in range(3, int(n**0.5) + 1, 2):
        if n % i == 0:
            return False
    return True


def first_n_primes(n: int) -> list[int]:
    """Return a list of the first n prime numbers."""
    primes = []
    candidate = 2
    while len(primes) < n:
        if is_prime(candidate):
            primes.append(candidate)
        candidate += 1
    return primes


if __name__ == "__main__":
    primes = first_n_primes(20)
    print(f"The first 20 prime numbers are:")
    for i, p in enumerate(primes, 1):
        print(f"  {i:2}. {p}")
