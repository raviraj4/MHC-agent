from models import user

class InitNet():
    """
    Agent - Init Net Agent
    Environment - Users Meta-data Table
    State - i) Default Init Settings(auto-init - on/off) 
            ii) Custom Tuned
    Action - i) frequency of messages sent per day for the next week
            ii) timestamp allocation 
    Reward - i) responds (instantly: 10, after threshold time: 5)
             ii) doesnt respond (penalty: -1)
    """ 
    def __init__(self, user: user):
        self.user = user
    

    