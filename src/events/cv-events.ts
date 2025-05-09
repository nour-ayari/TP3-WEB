export class CvEvent {
    constructor(
      public readonly cvId: number,
      public readonly operation: string,
      public readonly performedBy: string,
    ) {}
  }
  