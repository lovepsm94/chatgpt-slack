class Queue {
  constructor() {
    this.isJobExecuting = false;
    this.jobs = [];
  }

  // add job to the queue
  push(job) {
    this.jobs.push(job);
  }

  // execute a job
  async execute() {
    if (this.jobs.length > 0 && !this.isJobExecuting) {
      console.log('A job is executing')
      this.isJobExecuting = true;
      await this.jobs[0]();
      this.isJobExecuting = false;
      this.jobs.shift();
    }
  }

  isEmpty() {
    return this.jobs.length === 0;
  }

  size() {
    return this.jobs.length;
  }
}

export default Queue;

