interface SM2Result {
  easeFactor: number;
  interval: number;
  repetition: number;
}

class SpacedRepetitionService {
  calculateNextReview(
    quality: number,
    easeFactor: number,
    interval: number,
    repetition: number
  ): SM2Result {
    let newEaseFactor = easeFactor;
    let newInterval = interval;
    let newRepetition = repetition;

    // Update ease factor based on quality
    newEaseFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Ensure ease factor stays within bounds
    if (newEaseFactor < 1.3) {
      newEaseFactor = 1.3;
    }

    // If quality is < 3, reset repetition
    if (quality < 3) {
      newRepetition = 0;
      newInterval = 1; // Next review is tomorrow
    } else {
      newRepetition += 1;

      // Calculate interval based on repetition
      if (newRepetition === 1) {
        newInterval = 1; // 1 day
      } else if (newRepetition === 2) {
        newInterval = 6; // 6 days
      } else {
        newInterval = Math.round(interval * newEaseFactor);
      }
    }
    return {
      easeFactor: newEaseFactor,
      interval: newInterval,
      repetition: newRepetition,
    };
  }

  //  Callculate next review date
  calculateNextReviewDate(interval: number): Date {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    nextDate.setHours(0, 0, 0, 0); // Set to start of day
    return nextDate;
  }

  // Determine masterly level based on repetition

  calculateMasteryLevel(easeFactor: number, repetition: number): number {
    if (repetition === 0) return 0; // New card

    if (repetition === 1) return 1; // Learning

    if (repetition === 2) return 2; // Reviewing

    if (repetition >= 3 && easeFactor >= 2.5) return 5; // Mastered

    if (repetition >= 3 && easeFactor >= 2.2) return 4; // Well known

    if (repetition >= 3) return 3; // Familiar

    return 2; // Default to reviewing
  }

  /**
   * Check if card is due for review
   */
  isDue(nextReviewDate: Date | null): boolean {
    if (!nextReviewDate) return true; // New cards are always due

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Compare dates only

    return nextReviewDate <= now;
  }

  /**
   * Get suggested study session size based on due cards
   */
  getSuggestedSessionSize(dueCardsCount: number): number {
    if (dueCardsCount <= 20) return dueCardsCount;
    if (dueCardsCount <= 50) return 20;
    if (dueCardsCount <= 100) return 30;
    return 50; // Maximum recommended session size
  }

  /**
   * Calculate study streak
   */
  calculateStreak(
    lastReviewDate: Date | null,
    currentDate: Date = new Date()
  ): boolean {
    if (!lastReviewDate) return false;

    const lastReview = new Date(lastReviewDate);
    lastReview.setHours(0, 0, 0, 0);

    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Streak continues if reviewed today or yesterday
    return lastReview >= yesterday;
  }

  /**
   * Get difficulty distribution for analytics
   */
  getDifficultyDistribution(cards: Array<{ masteryLevel: number }>) {
    const distribution = {
      new: 0,
      learning: 0,
      reviewing: 0,
      familiar: 0,
      wellKnown: 0,
      mastered: 0,
    };

    cards.forEach((card) => {
      switch (card.masteryLevel) {
        case 0:
          distribution.new++;
          break;
        case 1:
          distribution.learning++;
          break;
        case 2:
          distribution.reviewing++;
          break;
        case 3:
          distribution.familiar++;
          break;
        case 4:
          distribution.wellKnown++;
          break;
        case 5:
          distribution.mastered++;
          break;
      }
    });

    return distribution;
  }

  /**
   * Calculate optimal review time
   * Returns best time of day based on user's study history
   */
  getOptimalReviewTime(
    studyHistory: Array<{ hour: number; accuracy: number }>
  ) {
    if (studyHistory.length === 0) {
      return 9; // Default to 9 AM
    }

    // Find hour with best accuracy
    const hourStats = studyHistory.reduce(
      (acc, session) => {
        const key = session.hour;
        if (!acc[key]) {
          acc[key] = { total: 0, count: 0 };
        }
        acc[key]!.total += session.accuracy;
        acc[key]!.count++;
        return acc;
      },
      {} as Record<number, { total: number; count: number }>
    );

    let bestHour = 9;
    let bestAccuracy = 0;

    Object.entries(hourStats).forEach(([hour, stats]) => {
      const avgAccuracy = stats.total / stats.count;
      if (avgAccuracy > bestAccuracy) {
        bestAccuracy = avgAccuracy;
        bestHour = parseInt(hour);
      }
    });

    return bestHour;
  }

  /**
   * Predict retention based on interval and ease factor
   * Returns probability of recall (0-1)
   */
  predictRetention(
    interval: number,
    easeFactor: number,
    daysSinceReview: number
  ): number {
    // Simplified retention formula
    // R = e^(-t/s)
    // where t = time since review, s = strength (related to ease factor)

    const strength = easeFactor * interval;
    const retention = Math.exp(-daysSinceReview / strength);

    return Math.max(0, Math.min(1, retention));
  }
}

export default new SpacedRepetitionService();
